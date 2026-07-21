"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { deals, leads } from "@/db/schema";
import {
  getRecordUpdateConditions,
  getWorkspaceAuthorizationContext,
  hasWorkspacePermission,
} from "@/lib/authorization";
import { requireUserId } from "@/lib/auth";
import { DEAL_STAGE_LABELS } from "@/lib/constants/crm";
import { DEMO_MUTATION_MESSAGE, isDemoWorkspace } from "@/lib/demo";
import { createNotification } from "@/lib/notifications";
import {
  leadFollowUpSchema,
  type LeadFollowUpValues,
} from "@/lib/validations/lead";
import { getCurrentWorkspace } from "@/lib/workspaces";
import { createLeadActivity } from "../../services/activity-service";
import {
  dealStageForLeadStatus,
  formatActivityDate,
  normalizeDealProbability,
  parseDateInput,
} from "../../services/lead-workflow-service";
import {
  canAccessWorkspaceRecord,
  crmUpdatePermissionError,
  ensureLeadMutationAllowed,
  revalidateLeadPaths,
} from "../shared";
import type {
  LeadFollowUpMutationState,
  LeadQuickStatusState,
} from "../types";
import {
  isLeadActionId,
  isLeadStatusActionValue as isLeadStatus,
} from "../../validations/action-inputs";

export async function updateLeadStatusQuickAction(
  leadId: string,
  status: string,
): Promise<LeadQuickStatusState> {
  if (!isLeadActionId(leadId)) {
    return {
      success: false,
      message: "This lead could not be found.",
    };
  }

  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();

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

  if (!isLeadStatus(status)) {
    return {
      success: false,
      message: "Select a valid lead stage.",
    };
  }

  try {
    const [existingLead] = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
        status: leads.status,
        assignedOwnerUserId: leads.assignedOwnerUserId,
      })
      .from(leads)
      .where(
        and(
          eq(leads.id, leadId),
          ...getRecordUpdateConditions(
            getWorkspaceAuthorizationContext(workspace, userId),
            leads.workspaceId,
            leads.assignedOwnerUserId,
          ),
        ),
      )
      .limit(1);

    if (!existingLead) {
      return {
        success: false,
        message: "This lead could not be found.",
      };
    }

    if (!canAccessWorkspaceRecord(workspace, userId, existingLead.assignedOwnerUserId, "update")) {
      return { success: false, message: "This lead could not be found or you do not have permission to update it." };
    }

    if (existingLead.status === status) {
      return {
        success: true,
        status,
        message: `Lead is already in ${status}.`,
      };
    }

    const syncedDealStage = hasWorkspacePermission(workspace.role, "crm:update_all")
      ? dealStageForLeadStatus(status)
      : null;
    const { updatedLead, updatedDeal } = await db.transaction(async (tx) => {
      const [lead] = await tx
        .update(leads)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(leads.id, leadId),
            ...getRecordUpdateConditions(
              getWorkspaceAuthorizationContext(workspace, userId),
              leads.workspaceId,
              leads.assignedOwnerUserId,
            ),
          ),
        )
        .returning({
          id: leads.id,
          fullName: leads.fullName,
          status: leads.status,
        });

      if (!lead || !syncedDealStage) {
        return { updatedLead: lead ?? null, updatedDeal: null };
      }

      const [existingDeal] = await tx
        .select({
          id: deals.id,
          name: deals.name,
          stage: deals.stage,
          lostReason: deals.lostReason,
          ownerUserId: deals.ownerUserId,
        })
        .from(deals)
        .where(and(eq(deals.leadId, leadId), eq(deals.workspaceId, workspace.id)))
        .limit(1);

      if (!existingDeal || existingDeal.stage === syncedDealStage) {
        return { updatedLead: lead, updatedDeal: null };
      }

      const [deal] = await tx
        .update(deals)
        .set({
          stage: syncedDealStage,
          probability: normalizeDealProbability(syncedDealStage, 0),
          closedAt: new Date(),
          lostReason: syncedDealStage === "lost" ? existingDeal.lostReason : null,
          updatedAt: new Date(),
        })
        .where(and(eq(deals.id, existingDeal.id), eq(deals.workspaceId, workspace.id)))
        .returning({
          id: deals.id,
          name: deals.name,
          stage: deals.stage,
        });

      const notificationUserId =
        existingDeal.ownerUserId ?? existingLead.assignedOwnerUserId;
      if (deal && notificationUserId && notificationUserId !== userId) {
        await createNotification({
          client: tx,
          workspaceId: workspace.id,
          userId: notificationUserId,
          type: "deal_stage_changed",
          title: "Deal stage updated",
          message: `${deal.name} moved to ${DEAL_STAGE_LABELS[deal.stage]}.`,
          actionUrl: `/dashboard/leads/${leadId}#lead-deal`,
          metadata: { entityType: "deal", entityId: deal.id },
          dedupeKey: `deal-stage:${deal.id}:${deal.stage}`,
        });
      }

      return {
        updatedLead: lead,
        updatedDeal: deal
          ? {
              name: deal.name,
              previousStage: existingDeal.stage,
              stage: deal.stage,
            }
          : null,
      };
    });

    if (!updatedLead) {
      return {
        success: false,
        message: "This lead could not be found.",
      };
    }

    await createLeadActivity({
      workspaceId: workspace.id,
      userId,
      eventType: "lead_status_changed",
      message: `Lead status changed: ${updatedLead.fullName} (${existingLead.status} -> ${updatedLead.status})`,
      leadId: updatedLead.id,
      leadName: updatedLead.fullName,
    });

    if (updatedDeal) {
      await createLeadActivity({
        workspaceId: workspace.id,
        userId,
        eventType: "deal_stage_changed",
        message: `Deal stage changed: ${updatedDeal.name} (${updatedDeal.previousStage} -> ${updatedDeal.stage})`,
        leadId: updatedLead.id,
        leadName: updatedLead.fullName,
      });
    }

    revalidateLeadPaths(leadId);

    return {
      success: true,
      status: updatedLead.status,
      message: `Lead stage updated to ${updatedLead.status}.`,
    };
  } catch {
    return {
      success: false,
      message: "We couldn't update lead stage right now. Please try again.",
    };
  }
}



export async function updateLeadFollowUpAction(
  leadId: string,
  input: LeadFollowUpValues,
): Promise<LeadFollowUpMutationState> {
  if (!isLeadActionId(leadId)) {
    return {
      success: false,
      message: "This lead could not be found.",
    };
  }

  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();
  const parsed = leadFollowUpSchema.safeParse(input);

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

  if (!parsed.success) {
    return {
      success: false,
      message: "Please review the follow-up details and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const [existingLead] = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
        assignedOwnerUserId: leads.assignedOwnerUserId,
        nextFollowUpDate: leads.nextFollowUpDate,
        followUpNote: leads.followUpNote,
      })
      .from(leads)
      .where(
        and(
          eq(leads.id, leadId),
          ...getRecordUpdateConditions(
            getWorkspaceAuthorizationContext(workspace, userId),
            leads.workspaceId,
            leads.assignedOwnerUserId,
          ),
        ),
      )
      .limit(1);

    if (!existingLead) {
      return {
        success: false,
        message: "This lead could not be found.",
      };
    }

    if (!canAccessWorkspaceRecord(workspace, userId, existingLead.assignedOwnerUserId, "update")) {
      return { success: false, message: "This lead could not be found or you do not have permission to update it." };
    }

    const nextFollowUpDate = parseDateInput(parsed.data.nextFollowUpDate);
    const followUpNote = parsed.data.followUpNote ?? null;

    await db
      .update(leads)
      .set({
        nextFollowUpDate,
        followUpNote,
        followUpPriority: parsed.data.followUpPriority,
        followUpStatus: parsed.data.followUpStatus,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(leads.id, leadId),
          ...getRecordUpdateConditions(
            getWorkspaceAuthorizationContext(workspace, userId),
            leads.workspaceId,
            leads.assignedOwnerUserId,
          ),
        ),
      );

    const hadFollowUp =
      Boolean(existingLead.nextFollowUpDate) ||
      Boolean(existingLead.followUpNote?.trim());
    const hasFollowUp = Boolean(nextFollowUpDate) || Boolean(followUpNote?.trim());
    const timelineMessage = !hasFollowUp
      ? `Follow-up cleared for ${existingLead.fullName}`
      : !hadFollowUp
        ? `Follow-up scheduled for ${existingLead.fullName} on ${formatActivityDate(nextFollowUpDate ?? new Date())}`
        : `Follow-up updated for ${existingLead.fullName}${nextFollowUpDate ? ` to ${formatActivityDate(nextFollowUpDate)}` : ""}`;

    await createLeadActivity({
      workspaceId: workspace.id,
      userId,
      eventType: "lead_updated",
      message: timelineMessage,
      leadId,
      leadName: existingLead.fullName,
    });

    revalidateLeadPaths(leadId);

    return {
      success: true,
      message: hasFollowUp ? "Follow-up updated." : "Follow-up cleared.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn't update this follow-up right now. Please try again.",
    };
  }
}

