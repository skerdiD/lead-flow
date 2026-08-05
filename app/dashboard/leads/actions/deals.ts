"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { deals, leads } from "@/db/schema";
import {
  getRecordUpdateConditions,
  getWorkspaceAuthorizationContext,
} from "@/lib/authorization";
import { requireUserId } from "@/lib/auth";
import { DEAL_STAGE_LABELS } from "@/lib/constants/crm";
import { DEMO_MUTATION_MESSAGE, isDemoWorkspace } from "@/lib/demo";
import { createNotificationBestEffort } from "@/lib/notifications";
import { dealLostReasonSchema } from "@/lib/validations/deal";
import { getCurrentWorkspace } from "@/lib/workspaces";
import { createLeadActivity } from "../services/activity-service";
import {
  leadStatusForDealStage,
  normalizeDealProbability,
} from "../services/lead-workflow-service";
import {
  canAccessWorkspaceRecord,
  crmUpdatePermissionError,
  ensureLeadMutationAllowed,
  revalidateLeadPaths,
} from "./shared";
import type { DealStageMutationState } from "./types";
import {
  isDealStageActionValue as isDealStage,
  isLeadActionId,
} from "../validations/action-inputs";

export async function updateDealStageAction(
  leadId: string,
  dealId: string,
  stage: string,
  lostReason?: string,
): Promise<DealStageMutationState> {
  if (!isLeadActionId(leadId) || !isLeadActionId(dealId)) {
    return {
      success: false,
      message: "This opportunity could not be found.",
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

  if (!isDealStage(stage)) {
    return {
      success: false,
      message: "Select a valid deal stage.",
    };
  }

  const parsedLostReason = stage === "lost"
    ? dealLostReasonSchema.safeParse(lostReason)
    : null;
  if (parsedLostReason && !parsedLostReason.success) {
    return {
      success: false,
      message: parsedLostReason.error.issues[0]?.message ?? "Enter a lost reason.",
    };
  }

  try {
    const [existingDeal] = await db
      .select({
        id: deals.id,
        name: deals.name,
        stage: deals.stage,
        probability: deals.probability,
        leadStatus: leads.status,
        leadName: leads.fullName,
        ownerUserId: deals.ownerUserId,
        assignedOwnerUserId: leads.assignedOwnerUserId,
      })
      .from(deals)
      .innerJoin(leads, eq(deals.leadId, leads.id))
      .where(
        and(
          eq(deals.id, dealId),
          eq(deals.leadId, leadId),
          eq(deals.workspaceId, workspace.id),
          eq(leads.workspaceId, workspace.id),
        ),
      )
      .limit(1);

    if (!existingDeal) {
      return {
        success: false,
        message: "This opportunity could not be found.",
      };
    }

    if (!canAccessWorkspaceRecord(
      workspace,
      userId,
      existingDeal.ownerUserId ?? existingDeal.assignedOwnerUserId,
      "update",
    )) {
      return { success: false, message: "This opportunity could not be found or you do not have permission to update it." };
    }

    if (existingDeal.stage === stage) {
      return {
        success: true,
        stage,
        message: `Deal is already in ${stage}.`,
      };
    }

    const syncedLeadStatus = canAccessWorkspaceRecord(
      workspace,
      userId,
      existingDeal.assignedOwnerUserId,
      "update",
    )
      ? leadStatusForDealStage(stage)
      : null;
    const { updatedDeal, notification } = await db.transaction(async (tx) => {
      const [deal] = await tx
        .update(deals)
        .set({
          stage,
          probability: normalizeDealProbability(stage, existingDeal.probability),
          closedAt: stage === "won" || stage === "lost" ? new Date() : null,
          lostReason: stage === "lost" ? parsedLostReason?.data : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(deals.id, dealId),
            ...getRecordUpdateConditions(
              getWorkspaceAuthorizationContext(workspace, userId),
              deals.workspaceId,
              deals.ownerUserId,
            ),
          ),
        )
        .returning({ stage: deals.stage });

      const notificationUserId =
        existingDeal.ownerUserId ?? existingDeal.assignedOwnerUserId;
      const notification = deal && notificationUserId && notificationUserId !== userId
        ? {
          workspaceId: workspace.id,
          userId: notificationUserId,
          type: "deal_stage_changed" as const,
          title: "Deal stage updated",
          message: `${existingDeal.name} moved to ${DEAL_STAGE_LABELS[deal.stage]}.`,
          actionUrl: `/dashboard/leads/${leadId}#lead-deal`,
          metadata: { entityType: "deal", entityId: dealId },
          dedupeKey: `deal-stage:${dealId}:${deal.stage}`,
        }
        : null;

      if (deal) {
        await createLeadActivity({
          client: tx,
          workspaceId: workspace.id,
          userId,
          eventType: "deal_stage_changed",
          message: `Deal stage changed: ${existingDeal.name} (${existingDeal.stage} -> ${deal.stage})`,
          leadId,
          leadName: existingDeal.leadName,
        });
      }

      if (!deal || !syncedLeadStatus || existingDeal.leadStatus === syncedLeadStatus) {
        return { updatedDeal: deal ?? null, updatedLead: null, notification };
      }

      const [lead] = await tx
        .update(leads)
        .set({
          status: syncedLeadStatus,
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
        .returning({ status: leads.status });

      if (lead) {
        await createLeadActivity({
          client: tx,
          workspaceId: workspace.id,
          userId,
          eventType: "lead_status_changed",
          message: `Lead status changed: ${existingDeal.leadName} (${existingDeal.leadStatus} -> ${lead.status})`,
          leadId,
          leadName: existingDeal.leadName,
        });
      }

      return { updatedDeal: deal, updatedLead: lead ?? null, notification };
    });

    if (!updatedDeal) {
      return {
        success: false,
        message: "This opportunity could not be found.",
      };
    }

    if (notification) {
      await createNotificationBestEffort(notification, {
        operation: "deal.stage.notification",
        entityType: "deal",
        entityId: dealId,
      });
    }

    revalidateLeadPaths(leadId);

    return {
      success: true,
      stage: updatedDeal.stage,
      message: `Deal stage updated to ${updatedDeal.stage}.`,
    };
  } catch {
    return {
      success: false,
      message: "We couldn't update this deal right now. Please try again.",
    };
  }
}
