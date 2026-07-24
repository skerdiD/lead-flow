"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePathBestEffort as revalidatePath } from "@/lib/revalidation.server";
import { db } from "@/db";
import { leads } from "@/db/schema";
import {
  getRecordUpdateConditions,
  getWorkspaceAuthorizationContext,
} from "@/lib/authorization";
import { requireUserId } from "@/lib/auth";
import { DEAL_STAGE_LABELS } from "@/lib/constants/crm";
import { DEMO_MUTATION_MESSAGE, isDemoWorkspace } from "@/lib/demo";
import { reportUnexpectedError } from "@/lib/error-reporting.server";
import { createNotificationBestEffort } from "@/lib/notifications";
import { getRequestId } from "@/lib/request-context.server";
import {
  leadFormSchema,
  type LeadFormValues,
} from "@/lib/validations/lead";
import { getCurrentWorkspace } from "@/lib/workspaces";
import { createLeadActivity } from "../../services/activity-service";
import {
  saveLeadAccount,
  saveLeadContact,
} from "../../services/contact-account-service";
import { saveLeadDeal } from "../../services/deal-service";
import {
  parseDateInput,
  reconcileLeadAndDealStage,
} from "../../services/lead-workflow-service";
import {
  canAccessWorkspaceRecord,
  crmUpdatePermissionError,
  ensureLeadMutationAllowed,
  workspacePermissionError,
} from "../shared";
import type { LeadMutationState } from "../types";
import { isLeadActionId } from "../../validations/action-inputs";

export async function createLeadAction(
  input: LeadFormValues,
): Promise<LeadMutationState> {
  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();
  const parsed = leadFormSchema.safeParse(input);

  const permissionError = workspacePermissionError(workspace.role, "crm:create");
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
      message: "Please review the form and fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const requestId = await getRequestId();

  try {
    const reconciled = reconcileLeadAndDealStage(
      parsed.data.status,
      parsed.data.dealStage,
    );
    const { createdLead } = await db.transaction(async (tx) => {
      const accountId = await saveLeadAccount({
        client: tx,
        workspaceId: workspace.id,
        userId,
        company: parsed.data.company,
      });
      const contactId = await saveLeadContact({
        client: tx,
        workspaceId: workspace.id,
        userId,
        accountId,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
      });

      const [lead] = await tx
        .insert(leads)
        .values({
          workspaceId: workspace.id,
          userId,
          assignedOwnerUserId: userId,
          accountId,
          primaryContactId: contactId,
          fullName: parsed.data.fullName,
          company: parsed.data.company ?? null,
          email: parsed.data.email ?? null,
          phone: parsed.data.phone ?? null,
          status: reconciled.status,
          source: parsed.data.source ?? null,
          notes: parsed.data.notes ?? null,
          nextFollowUpDate: parseDateInput(parsed.data.nextFollowUpDate),
          followUpNote: parsed.data.followUpNote ?? null,
          followUpPriority: parsed.data.followUpPriority,
          followUpStatus: parsed.data.followUpStatus,
        })
        .returning({
          id: leads.id,
          fullName: leads.fullName,
        });

      const deal = await saveLeadDeal({
        client: tx,
        workspaceId: workspace.id,
        userId,
        leadId: lead.id,
        accountId,
        contactId,
        ownerUserId: userId,
        dealName: parsed.data.dealName,
        dealStage: reconciled.dealStage,
        dealValue: parsed.data.dealValue,
        dealCurrency: parsed.data.dealCurrency,
        dealProbability: parsed.data.dealProbability,
        expectedCloseDate: parsed.data.expectedCloseDate,
        closedDate: parsed.data.closedDate,
        lostReason: parsed.data.lostReason,
        authorizationContext: getWorkspaceAuthorizationContext(workspace, userId),
      });

      await createLeadActivity({
        client: tx,
        workspaceId: workspace.id,
        userId,
        eventType: "lead_created",
        message: `Lead created: ${lead.fullName}`,
        leadId: lead.id,
        leadName: lead.fullName,
      });

      if (deal?.id) {
        await createLeadActivity({
          client: tx,
          workspaceId: workspace.id,
          userId,
          eventType: "deal_stage_changed",
          message: `Opportunity opened: ${parsed.data.dealName} (${reconciled.dealStage})`,
          leadId: lead.id,
          leadName: lead.fullName,
        });
      }

      return { createdLead: lead, createdDeal: deal };
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/activity");

    return {
      success: true,
      leadId: createdLead.id,
      message: "Lead created successfully.",
    };
  } catch (error) {
    await reportUnexpectedError(error, {
      event: "lead.create.failed",
      requestId,
      workspaceId: workspace.id,
      userId,
      operation: "lead.create",
    });
    return {
      success: false,
      message: "We couldn't create this lead right now. Please try again.",
    };
  }
}



export async function updateLeadAction(
  leadId: string,
  input: LeadFormValues,
): Promise<LeadMutationState> {
  if (!isLeadActionId(leadId)) {
    return {
      success: false,
      message: "This lead could not be found.",
    };
  }

  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();
  const parsed = leadFormSchema.safeParse(input);

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
      message: "Please review the form and fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const [existingLead] = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
        assignedOwnerUserId: leads.assignedOwnerUserId,
        status: leads.status,
        accountId: leads.accountId,
        primaryContactId: leads.primaryContactId,
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

    const reconciled = reconcileLeadAndDealStage(
      parsed.data.status,
      parsed.data.dealStage,
    );
    const { updatedLead, notification } = await db.transaction(async (tx) => {
      const accountId = await saveLeadAccount({
        client: tx,
        workspaceId: workspace.id,
        userId,
        existingAccountId: existingLead.accountId,
        company: parsed.data.company,
      });
      const contactId = await saveLeadContact({
        client: tx,
        workspaceId: workspace.id,
        userId,
        existingContactId: existingLead.primaryContactId,
        accountId,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
      });

      const [lead] = await tx
        .update(leads)
        .set({
          accountId,
          primaryContactId: contactId,
          assignedOwnerUserId: existingLead.assignedOwnerUserId ?? userId,
          fullName: parsed.data.fullName,
          company: parsed.data.company ?? null,
          email: parsed.data.email ?? null,
          phone: parsed.data.phone ?? null,
          status: reconciled.status,
          source: parsed.data.source ?? null,
          notes: parsed.data.notes ?? null,
          nextFollowUpDate: parseDateInput(parsed.data.nextFollowUpDate),
          followUpNote: parsed.data.followUpNote ?? null,
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
        )
        .returning({
          id: leads.id,
          fullName: leads.fullName,
          status: leads.status,
        });

      if (!lead) {
        return {
          updatedLead: null,
          savedDeal: null,
          notification: null,
        };
      }

      const deal = await saveLeadDeal({
        client: tx,
        workspaceId: workspace.id,
        userId,
        leadId,
        accountId,
        contactId,
        ownerUserId: existingLead.assignedOwnerUserId ?? userId,
        dealName: parsed.data.dealName,
        dealStage: reconciled.dealStage,
        dealValue: parsed.data.dealValue,
        dealCurrency: parsed.data.dealCurrency,
        dealProbability: parsed.data.dealProbability,
        expectedCloseDate: parsed.data.expectedCloseDate,
        closedDate: parsed.data.closedDate,
        lostReason: parsed.data.lostReason,
        authorizationContext: getWorkspaceAuthorizationContext(workspace, userId),
      });

      const notificationUserId = existingLead.assignedOwnerUserId ?? userId;
      const notification = (
        deal?.id &&
        deal.previousStage &&
        deal.previousStage !== deal.stage &&
        notificationUserId !== userId
      )
        ? {
          workspaceId: workspace.id,
          userId: notificationUserId,
          type: "deal_stage_changed" as const,
          title: "Deal stage updated",
          message: `${parsed.data.dealName} moved to ${DEAL_STAGE_LABELS[deal.stage]}.`,
          actionUrl: `/dashboard/leads/${leadId}#lead-deal`,
          metadata: { entityType: "deal", entityId: deal.id },
          dedupeKey: `deal-stage:${deal.id}:${deal.stage}`,
        }
        : null;

      const statusChanged = existingLead.status !== lead.status;
      await createLeadActivity({
        client: tx,
        workspaceId: workspace.id,
        userId,
        eventType: statusChanged ? "lead_status_changed" : "lead_updated",
        message: statusChanged
          ? `Lead status changed: ${lead.fullName} (${existingLead.status} -> ${lead.status})`
          : `Lead updated: ${lead.fullName}`,
        leadId: lead.id,
        leadName: lead.fullName,
      });

      if (deal?.previousStage && deal.previousStage !== deal.stage) {
        await createLeadActivity({
          client: tx,
          workspaceId: workspace.id,
          userId,
          eventType: "deal_stage_changed",
          message: `Deal stage changed: ${parsed.data.dealName} (${deal.previousStage} -> ${deal.stage})`,
          leadId: lead.id,
          leadName: lead.fullName,
        });
      }

      if (lead.status === "Interested" && existingLead.status !== "Interested") {
        await createLeadActivity({
          client: tx,
          workspaceId: workspace.id,
          userId,
          eventType: "lead_qualified",
          message: `Lead qualified: ${lead.fullName}`,
          leadId: lead.id,
          leadName: lead.fullName,
        });
      }

      return { updatedLead: lead, savedDeal: deal, notification };
    });

    if (!updatedLead) {
      return {
        success: false,
        message: "This lead could not be found.",
      };
    }

    if (notification) {
      await createNotificationBestEffort(notification, {
        operation: "lead.update.notification",
        entityType: "lead",
        entityId: leadId,
      });
    }


    revalidatePath("/dashboard");
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/activity");
    revalidatePath(`/dashboard/leads/${leadId}`);
    revalidatePath(`/dashboard/leads/${leadId}/edit`);

    return {
      success: true,
      leadId: updatedLead.id,
      message: "Lead updated successfully.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn't save your changes right now. Please try again.",
    };
  }
}
