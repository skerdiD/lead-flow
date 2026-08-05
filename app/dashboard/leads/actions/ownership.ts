"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { leads, workspaceMembers } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import {
  getRecordUpdateConditions,
  getWorkspaceAuthorizationContext,
} from "@/lib/authorization";
import { DEMO_MUTATION_MESSAGE, isDemoWorkspace } from "@/lib/demo";
import { getCurrentWorkspace } from "@/lib/workspaces";
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

    const updated = await db.transaction(async (tx) => {
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

      if (!record) return null;

      await createLeadActivity({
        client: tx,
        workspaceId: workspace.id,
        userId,
        eventType: "lead_updated",
        message: `Lead owner changed: ${lead.fullName}`,
        leadId,
        leadName: lead.fullName,
      });

      return record;
    });

    if (!updated) {
      return { success: false as const, message: "This lead could not be found." };
    }

    revalidateLeadPaths(leadId);
    return { success: true as const, message: "Lead owner updated." };
  } catch {
    return {
      success: false as const,
      message: "We couldn't update the lead owner right now. Please try again.",
    };
  }
}
