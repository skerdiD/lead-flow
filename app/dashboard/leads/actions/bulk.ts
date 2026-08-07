"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePathBestEffort as revalidatePath } from "@/lib/revalidation.server";
import { db } from "@/db";
import { leads } from "@/db/schema";
import {
  canAccessRecord,
  getRecordUpdateConditions,
  getWorkspaceAuthorizationContext,
} from "@/lib/authorization";
import { requireUserId } from "@/lib/auth";
import { DEMO_MUTATION_MESSAGE, isDemoWorkspace } from "@/lib/demo";
import { getCurrentWorkspace } from "@/lib/workspaces";
import { executeIdempotentMutation, getIdempotentReplay, IdempotencyConflictError } from "@/lib/idempotency.server";
import { getRequestId } from "@/lib/request-context.server";
import { createLeadActivity } from "../services/activity-service";
import {
  crmUpdatePermissionError,
  ensureLeadMutationAllowed,
  workspacePermissionError,
} from "./shared";
import type { BulkLeadActionState } from "./types";
import {
  isLeadStatusActionValue as isLeadStatus,
  parseBulkLeadIds as normalizeLeadIds,
} from "../validations/action-inputs";

export async function bulkUpdateLeadStatusAction(
  leadIds: string[],
  status: string,
  idempotencyKey?: string,
): Promise<BulkLeadActionState> {
  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed("crm:bulk");
  const normalizedIds = normalizeLeadIds(leadIds);

  const permissionError = crmUpdatePermissionError(workspace.role);
  if (permissionError) return { success: false, message: permissionError };

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
    };
  }

  if (isDemoWorkspace(workspace)) {
    return {
      success: false,
      message: DEMO_MUTATION_MESSAGE,
    };
  }

  if (normalizedIds.length === 0) {
    return {
      success: false,
      message: "Select at least one lead to update.",
    };
  }

  if (!isLeadStatus(status)) {
    return {
      success: false,
      message: "Select a valid lead stage.",
    };
  }

  if (idempotencyKey) {
    try {
      const affectedCount = await getIdempotentReplay<number>({ workspaceId: workspace.id, actorUserId: userId, action: "leads.bulk_status_update", idempotencyKey, request: { leadIds: normalizedIds, status } });
      if (affectedCount !== undefined) return { success: true, affectedCount, message: `${affectedCount} lead${affectedCount === 1 ? "" : "s"} updated to ${status}.` };
    } catch (error) {
      if (error instanceof IdempotencyConflictError) return { success: false, message: error.message };
      throw error;
    }
  }

  try {
    const ownedLeads = await db
      .select({
        id: leads.id,
        status: leads.status,
        assignedOwnerUserId: leads.assignedOwnerUserId,
      })
      .from(leads)
      .where(
        and(
          eq(leads.workspaceId, workspace.id),
          eq(leads.isArchived, false),
          inArray(leads.id, normalizedIds),
        ),
      );

    if (ownedLeads.length === 0) {
      return {
        success: false,
        message: "No matching leads were found.",
      };
    }

    const accessContext = getWorkspaceAuthorizationContext(workspace, userId);
    const leadIdsToUpdate = ownedLeads
      .filter((lead) => canAccessRecord(
        accessContext,
        { workspaceId: workspace.id, assignedUserId: lead.assignedOwnerUserId },
        "update",
      ))
      .filter((lead) => lead.status !== status)
      .map((lead) => lead.id);

    if (leadIdsToUpdate.length === 0) {
      return {
        success: true,
        affectedCount: 0,
        message: `Selected leads are already in ${status}.`,
      };
    }

    const requestId = await getRequestId();
    const { value: affectedCount } = await executeIdempotentMutation({
      workspaceId: workspace.id,
      actorUserId: userId,
      action: "leads.bulk_status_update",
      idempotencyKey: idempotencyKey ?? requestId,
      request: { leadIds: normalizedIds, status },
    }, async (tx) => {
      await tx
        .update(leads)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(
          and(
            ...getRecordUpdateConditions(
              accessContext,
              leads.workspaceId,
              leads.assignedOwnerUserId,
            ),
            eq(leads.isArchived, false),
            inArray(leads.id, leadIdsToUpdate),
          ),
        );

      await createLeadActivity({
        client: tx,
        workspaceId: workspace.id,
        userId,
        eventType: "lead_status_changed",
        message: `${leadIdsToUpdate.length} lead${leadIdsToUpdate.length === 1 ? "" : "s"} moved to ${status}.`,
      });
      return { response: leadIdsToUpdate.length };
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/activity");

    return {
      success: true,
      affectedCount,
      message: `${affectedCount} lead${affectedCount === 1 ? "" : "s"} updated to ${status}.`,
    };
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: "We couldn't update the selected leads right now. Please try again.",
    };
  }
}


export async function bulkDeleteLeadsAction(
  leadIds: string[],
  idempotencyKey?: string,
): Promise<BulkLeadActionState> {
  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed("crm:bulk");
  const normalizedIds = normalizeLeadIds(leadIds);

  const permissionError = workspacePermissionError(workspace.role, "crm:delete");
  if (permissionError) return { success: false, message: permissionError };

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
    };
  }

  if (isDemoWorkspace(workspace)) {
    return {
      success: false,
      message: DEMO_MUTATION_MESSAGE,
    };
  }

  if (normalizedIds.length === 0) {
    return {
      success: false,
      message: "Select at least one lead to archive.",
    };
  }

  if (idempotencyKey) {
    try {
      const archivedLeads = await getIdempotentReplay<Array<{ id: string }>>({ workspaceId: workspace.id, actorUserId: userId, action: "leads.bulk_archive", idempotencyKey, request: { leadIds: normalizedIds } });
      if (archivedLeads !== undefined) {
        const affectedCount = archivedLeads.length;
        return { success: true, affectedCount, message: `${affectedCount} lead${affectedCount === 1 ? "" : "s"} archived successfully.` };
      }
    } catch (error) {
      if (error instanceof IdempotencyConflictError) return { success: false, message: error.message };
      throw error;
    }
  }

  try {
    const requestId = await getRequestId();
    const { value: archivedLeads } = await executeIdempotentMutation({
      workspaceId: workspace.id,
      actorUserId: userId,
      action: "leads.bulk_archive",
      idempotencyKey: idempotencyKey ?? requestId,
      request: { leadIds: normalizedIds },
    }, async (tx) => {
      const records = await tx
        .update(leads)
        .set({
          isArchived: true,
          archivedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(leads.workspaceId, workspace.id),
            eq(leads.isArchived, false),
            inArray(leads.id, normalizedIds),
          ),
        )
        .returning({
          id: leads.id,
        });

      if (records.length > 0) {
        await createLeadActivity({
          client: tx,
          workspaceId: workspace.id,
          userId,
          eventType: "lead_archived",
          message: `${records.length} lead${records.length === 1 ? "" : "s"} archived in bulk.`,
        });
      }

      return { response: records };
    });

    const affectedCount = archivedLeads.length;

    if (affectedCount === 0) {
      return {
        success: false,
        message: "No matching leads were found.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/activity");

    return {
      success: true,
      affectedCount,
      message: `${affectedCount} lead${affectedCount === 1 ? "" : "s"} archived successfully.`,
    };
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: "We couldn't archive the selected leads right now. Please try again.",
    };
  }
}
