"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { DEMO_MUTATION_MESSAGE, isDemoWorkspace } from "@/lib/demo";
import { getCurrentWorkspace } from "@/lib/workspaces";
import { createLeadActivity } from "../../services/activity-service";
import {
  ensureLeadMutationAllowed,
  revalidateLeadPaths,
  workspacePermissionError,
} from "../shared";
import type { DeleteLeadActionState } from "../types";
import { isLeadActionId } from "../../validations/action-inputs";

export async function deleteLeadAction(
  leadId: string,
): Promise<DeleteLeadActionState> {
  if (!isLeadActionId(leadId)) {
    return {
      success: false,
      message: "This lead could not be found or you do not have access to it.",
    };
  }

  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();

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

  try {
    const archivedLead = await db.transaction(async (tx) => {
      const [lead] = await tx
        .update(leads)
        .set({
          isArchived: true,
          archivedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(leads.id, leadId),
            eq(leads.workspaceId, workspace.id),
            eq(leads.isArchived, false),
          ),
        )
        .returning({
          id: leads.id,
          fullName: leads.fullName,
        });

      if (!lead) return null;

      await createLeadActivity({
        client: tx,
        workspaceId: workspace.id,
        userId,
        eventType: "lead_archived",
        message: `Lead archived: ${lead.fullName}`,
        leadId: lead.id,
        leadName: lead.fullName,
      });

      return lead;
    });

    if (!archivedLead) {
      return {
        success: false,
        message: "This lead could not be found or you do not have access to it.",
      };
    }

    revalidateLeadPaths(archivedLead.id);

    return {
      success: true,
      message: "Lead archived successfully.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn't archive this lead right now. Please try again.",
    };
  }
}



export async function restoreLeadAction(
  leadId: string,
): Promise<DeleteLeadActionState> {
  if (!isLeadActionId(leadId)) {
    return {
      success: false,
      message: "This lead could not be found or you do not have access to it.",
    };
  }

  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();

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

  try {
    const restoredLead = await db.transaction(async (tx) => {
      const [lead] = await tx
        .update(leads)
        .set({
          isArchived: false,
          archivedAt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(leads.id, leadId),
            eq(leads.workspaceId, workspace.id),
            eq(leads.isArchived, true),
          ),
        )
        .returning({
          id: leads.id,
          fullName: leads.fullName,
        });

      if (!lead) return null;

      await createLeadActivity({
        client: tx,
        workspaceId: workspace.id,
        userId,
        eventType: "lead_restored",
        message: `Lead restored: ${lead.fullName}`,
        leadId: lead.id,
        leadName: lead.fullName,
      });

      return lead;
    });

    if (!restoredLead) {
      return {
        success: false,
        message: "This lead could not be found or you do not have access to it.",
      };
    }

    revalidateLeadPaths(restoredLead.id);

    return {
      success: true,
      message: "Lead restored successfully.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn't restore this lead right now. Please try again.",
    };
  }
}
