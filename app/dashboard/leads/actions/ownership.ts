"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, contacts, deals, leads, workspaceMembers } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import {
  getRecordUpdateConditions,
  getWorkspaceAuthorizationContext,
} from "@/lib/authorization";
import { DEMO_MUTATION_MESSAGE, isDemoWorkspace } from "@/lib/demo";
import { getCurrentWorkspace } from "@/lib/workspaces";
import { writeAuditEvent } from "@/lib/audit-log.server";
import { getRequestId } from "@/lib/request-context.server";
import { executeIdempotentMutation, getIdempotentReplay, IdempotencyConflictError } from "@/lib/idempotency.server";
import { createLeadActivity } from "../services/activity-service";
import {
  ensureLeadMutationAllowed,
  revalidateLeadPaths,
  workspacePermissionError,
} from "./shared";
import { isLeadActionId } from "../validations/action-inputs";

export async function updateLeadOwnerAction(
  leadId: string,
  ownerUserId: string | null,
  idempotencyKey?: string,
) {
  if (!isLeadActionId(leadId)) {
    return { success: false as const, message: "This lead could not be found." };
  }

  if (
    ownerUserId !== null &&
    (typeof ownerUserId !== "string" || ownerUserId.length < 1 || ownerUserId.length > 255)
  ) {
    return { success: false as const, message: "Choose a valid workspace member." };
  }

  const [userId, workspace, protection] = await Promise.all([
    requireUserId(),
    getCurrentWorkspace(),
    ensureLeadMutationAllowed(),
  ]);

  const permissionError = workspacePermissionError(workspace.role, "crm:assign");
  if (permissionError) return { success: false as const, message: permissionError };
  if (!protection.ok) return { success: false as const, message: protection.message };
  if (isDemoWorkspace(workspace)) {
    return { success: false as const, message: DEMO_MUTATION_MESSAGE };
  }

  if (idempotencyKey) {
    try {
      const replay = await getIdempotentReplay<{ id: string } | null>({ workspaceId: workspace.id, actorUserId: userId, action: "lead.owner.update", idempotencyKey, request: { leadId, ownerUserId } });
      if (replay !== undefined) {
        return replay
          ? { success: true as const, message: "Lead owner updated." }
          : { success: false as const, message: "This lead could not be found." };
      }
    } catch (error) {
      if (error instanceof IdempotencyConflictError) return { success: false as const, message: error.message };
      throw error;
    }
  }

  const context = getWorkspaceAuthorizationContext(workspace, userId);

  try {
    const [leadRows, memberRows] = await Promise.all([
      db
        .select({
          id: leads.id,
          fullName: leads.fullName,
          assignedOwnerUserId: leads.assignedOwnerUserId,
        })
        .from(leads)
        .where(
          and(
            eq(leads.id, leadId),
            ...getRecordUpdateConditions(
              context,
              leads.workspaceId,
              leads.assignedOwnerUserId,
            ),
          ),
        )
        .limit(1),
      ownerUserId
        ? db
            .select({ userId: workspaceMembers.userId })
            .from(workspaceMembers)
            .where(
              and(
                eq(workspaceMembers.workspaceId, workspace.id),
                eq(workspaceMembers.userId, ownerUserId),
              ),
            )
            .limit(1)
        : Promise.resolve([]),
    ]);

    const lead = leadRows[0];
    if (!lead) {
      return { success: false as const, message: "This lead could not be found." };
    }
    if (ownerUserId && !memberRows[0]) {
      return { success: false as const, message: "Choose a valid workspace member." };
    }
    if (lead.assignedOwnerUserId === ownerUserId) {
      return { success: true as const, message: "Lead owner is already up to date." };
    }

    const requestId = await getRequestId();
    const { value: updated } = await executeIdempotentMutation({
      workspaceId: workspace.id,
      actorUserId: userId,
      action: "lead.owner.update",
      idempotencyKey: idempotencyKey ?? requestId,
      request: { leadId, ownerUserId },
    }, async (tx) => {
      if (ownerUserId) {
        const [currentMember] = await tx
          .select({ userId: workspaceMembers.userId })
          .from(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.workspaceId, workspace.id),
              eq(workspaceMembers.userId, ownerUserId),
            ),
          )
          .for("share")
          .limit(1);
        if (!currentMember) return { response: null };
      }

      const [currentLead] = await tx
        .select({
          id: leads.id,
          fullName: leads.fullName,
          assignedOwnerUserId: leads.assignedOwnerUserId,
          accountId: leads.accountId,
          primaryContactId: leads.primaryContactId,
        })
        .from(leads)
        .where(
          and(
            eq(leads.id, leadId),
            ...getRecordUpdateConditions(
              context,
              leads.workspaceId,
              leads.assignedOwnerUserId,
            ),
          ),
        )
        .for("update")
        .limit(1);

      if (!currentLead) return { response: null };
      if (currentLead.assignedOwnerUserId === ownerUserId) {
        return {
          response: { id: currentLead.id },
          resource: { type: "lead", id: currentLead.id },
        };
      }

      const [linkedDeal] = await tx
        .select({ id: deals.id })
        .from(deals)
        .where(
          and(
            eq(deals.workspaceId, workspace.id),
            eq(deals.leadId, leadId),
          ),
        )
        .for("update")
        .limit(1);
      const [linkedAccount] = currentLead.accountId
        ? await tx
            .select({ id: accounts.id })
            .from(accounts)
            .where(
              and(
                eq(accounts.id, currentLead.accountId),
                ...getRecordUpdateConditions(
                  context,
                  accounts.workspaceId,
                  accounts.assignedOwnerUserId,
                ),
              ),
            )
            .for("update")
            .limit(1)
        : [];
      const [linkedContact] = currentLead.primaryContactId
        ? await tx
            .select({ id: contacts.id })
            .from(contacts)
            .where(
              and(
                eq(contacts.id, currentLead.primaryContactId),
                ...getRecordUpdateConditions(
                  context,
                  contacts.workspaceId,
                  contacts.assignedOwnerUserId,
                ),
              ),
            )
            .for("update")
            .limit(1)
        : [];

      // An existing linked record which is not visible to the authorized
      // assignment actor must fail the whole operation rather than leaving
      // ownership partially synchronized.
      if (
        (currentLead.accountId && !linkedAccount) ||
        (currentLead.primaryContactId && !linkedContact)
      ) {
        throw new Error("A linked CRM record could not be found or updated.");
      }

      const [record] = await tx
        .update(leads)
        .set({ assignedOwnerUserId: ownerUserId, updatedAt: new Date() })
        .where(
          and(
            eq(leads.id, leadId),
            ...getRecordUpdateConditions(
              context,
              leads.workspaceId,
              leads.assignedOwnerUserId,
            ),
          ),
        )
        .returning({ id: leads.id });

      if (!record) return { response: null };

      if (linkedDeal) {
        const [updatedDeal] = await tx
          .update(deals)
          .set({ ownerUserId, updatedAt: new Date() })
          .where(
            and(
              eq(deals.id, linkedDeal.id),
              ...getRecordUpdateConditions(
                context,
                deals.workspaceId,
                deals.ownerUserId,
              ),
            ),
          )
          .returning({ id: deals.id });
        if (!updatedDeal) throw new Error("Linked deal ownership update failed.");
      }

      if (linkedAccount) {
        const [updatedAccount] = await tx
          .update(accounts)
          .set({ assignedOwnerUserId: ownerUserId, updatedAt: new Date() })
          .where(
            and(
              eq(accounts.id, linkedAccount.id),
              ...getRecordUpdateConditions(
                context,
                accounts.workspaceId,
                accounts.assignedOwnerUserId,
              ),
            ),
          )
          .returning({ id: accounts.id });
        if (!updatedAccount) {
          throw new Error("Linked account ownership update failed.");
        }
      }

      if (linkedContact) {
        const [updatedContact] = await tx
          .update(contacts)
          .set({ assignedOwnerUserId: ownerUserId, updatedAt: new Date() })
          .where(
            and(
              eq(contacts.id, linkedContact.id),
              ...getRecordUpdateConditions(
                context,
                contacts.workspaceId,
                contacts.assignedOwnerUserId,
              ),
            ),
          )
          .returning({ id: contacts.id });
        if (!updatedContact) {
          throw new Error("Linked contact ownership update failed.");
        }
      }

      await createLeadActivity({
        client: tx,
        workspaceId: workspace.id,
        userId,
        eventType: "lead_updated",
        message: `Lead owner changed: ${currentLead.fullName}`,
        leadId,
        leadName: currentLead.fullName,
      });
      await writeAuditEvent({
        tx,
        workspaceId: workspace.id,
        actor: { userId, role: workspace.role },
        action: "lead.updated",
        entity: { type: "lead", id: leadId },
        before: { assignedOwnerUserId: currentLead.assignedOwnerUserId },
        after: { assignedOwnerUserId: ownerUserId },
        requestId,
      });

      return { response: record, resource: { type: "lead", id: record.id } };
    });

    if (!updated) {
      return { success: false as const, message: "This lead could not be found." };
    }

    revalidateLeadPaths(leadId);
    return { success: true as const, message: "Lead owner updated." };
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return { success: false as const, message: error.message };
    }
    return {
      success: false as const,
      message: "We couldn't update the lead owner right now. Please try again.",
    };
  }
}
