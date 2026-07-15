"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  accounts,
  activityEvents,
  contacts,
  crmTasks,
  deals,
  leadNotes,
  leads,
} from "@/db/schema";
import { protectLeadMutation } from "@/lib/arcjet";
import {
  hasWorkspacePermission,
  permissionDeniedMessage,
  type WorkspacePermission,
} from "@/lib/authorization";
import { requireUserId } from "@/lib/auth";
import { DEMO_MUTATION_MESSAGE, isDemoWorkspace } from "@/lib/demo";
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGES,
  type DealStage,
} from "@/lib/constants/crm";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/constants/leads";
import { moneyToCents } from "@/lib/revenue";
import { createNotification } from "@/lib/notifications";
import { getLocalDateKey, getTaskTimelineBucket } from "@/lib/tasks";
import {
  crmTaskFormSchema,
  type CrmTaskFormValues,
} from "@/lib/validations/crm-task";
import { leadNoteSchema } from "@/lib/validations/lead-note";
import {
  leadFollowUpSchema,
  leadFormSchema,
  type LeadFollowUpValues,
  type LeadFormValues,
} from "@/lib/validations/lead";
import { isUuid, normalizeUuidList } from "@/lib/uuid";
import { getCurrentWorkspace } from "@/lib/workspaces";

type DbClient = Pick<typeof db, "delete" | "insert" | "select" | "update">;

export type LeadMutationState =
  | {
      success: true;
      leadId: string;
      message: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Partial<Record<keyof LeadFormValues, string[]>>;
    };

export type DeleteLeadActionState =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message: string;
    };

export type BulkLeadActionState =
  | {
      success: true;
      message: string;
      affectedCount: number;
    }
  | {
      success: false;
      message: string;
      affectedCount?: number;
    };

export type LeadNoteMutationState =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: {
        content?: string[];
      };
    };

export type CrmTaskMutationState =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Partial<Record<keyof CrmTaskFormValues, string[]>>;
    };

export type DealStageMutationState =
  | {
      success: true;
      message: string;
      stage: DealStage;
    }
  | {
      success: false;
      message: string;
    };

export type LeadQuickStatusState =
  | {
      success: true;
      message: string;
      status: LeadStatus;
    }
  | {
      success: false;
      message: string;
    };

export type LeadFollowUpMutationState =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Partial<Record<keyof LeadFollowUpValues, string[]>>;
    };

type LeadActivityEventType =
  | "lead_created"
  | "lead_updated"
  | "lead_status_changed"
  | "lead_deleted"
  | "lead_archived"
  | "lead_restored"
  | "lead_note_added"
  | "lead_note_updated"
  | "lead_note_deleted"
  | "task_created"
  | "task_completed"
  | "deal_stage_changed"
  | "lead_qualified";

function normalizeLeadIds(leadIds: string[]) {
  return normalizeUuidList(leadIds, 200);
}

function isLeadStatus(value: string): value is LeadStatus {
  return LEAD_STATUSES.includes(value as LeadStatus);
}

function isDealStage(value: string): value is DealStage {
  return DEAL_STAGES.includes(value as DealStage);
}

function parseTaskDueAt(value?: string) {
  if (!value) return null;

  const dueAt = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(dueAt.getTime()) ? null : dueAt;
}

function parseDateInput(value?: string) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function reconcileLeadAndDealStage(status: LeadStatus, dealStage: DealStage) {
  if (dealStage === "won") {
    return { status: "Closed" as LeadStatus, dealStage };
  }

  if (dealStage === "lost") {
    return { status: "Lost" as LeadStatus, dealStage };
  }

  if (status === "Closed") {
    return { status, dealStage: "won" as DealStage };
  }

  if (status === "Lost") {
    return { status, dealStage: "lost" as DealStage };
  }

  return { status, dealStage };
}

function leadStatusForDealStage(stage: DealStage): LeadStatus | null {
  if (stage === "won") return "Closed";
  if (stage === "lost") return "Lost";
  return null;
}

function dealStageForLeadStatus(status: LeadStatus): DealStage | null {
  if (status === "Closed") return "won";
  if (status === "Lost") return "lost";
  return null;
}

function resolveClosedAt(params: {
  stage: DealStage;
  closedDate?: string;
  existingClosedAt?: Date | null;
}) {
  const parsedClosedDate = parseDateInput(params.closedDate);

  if (parsedClosedDate) {
    return parsedClosedDate;
  }

  if (params.stage === "won" || params.stage === "lost") {
    return params.existingClosedAt ?? new Date();
  }

  return null;
}

function getInitialTaskStatus(dueAt: Date | null) {
  void dueAt;
  return "pending" as const;
}

function normalizeDealProbability(stage: DealStage, probability: number) {
  if (stage === "won") return 100;
  if (stage === "lost") return 0;
  return probability;
}

function formatActivityDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function revalidateLeadPaths(leadId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/activity");
  revalidatePath(`/dashboard/leads/${leadId}`);
  revalidatePath(`/dashboard/leads/${leadId}/edit`);
}

async function saveLeadAccount(params: {
  client?: DbClient;
  workspaceId: string;
  userId: string;
  existingAccountId?: string | null;
  company?: string;
}) {
  const client = params.client ?? db;

  if (!params.company) return null;

  if (params.existingAccountId) {
    const [updatedAccount] = await client
      .update(accounts)
      .set({
        name: params.company,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(accounts.id, params.existingAccountId),
          eq(accounts.workspaceId, params.workspaceId),
        ),
      )
      .returning({ id: accounts.id });

    if (updatedAccount) {
      return updatedAccount.id;
    }
  }

  const [createdAccount] = await client
    .insert(accounts)
    .values({
      workspaceId: params.workspaceId,
      userId: params.userId,
      name: params.company,
    })
    .returning({ id: accounts.id });

  return createdAccount?.id ?? null;
}

async function saveLeadContact(params: {
  client?: DbClient;
  workspaceId: string;
  userId: string;
  existingContactId?: string | null;
  accountId?: string | null;
  fullName: string;
  email?: string;
  phone?: string;
}) {
  const client = params.client ?? db;

  if (params.existingContactId) {
    const [updatedContact] = await client
      .update(contacts)
      .set({
        accountId: params.accountId ?? null,
        fullName: params.fullName,
        email: params.email ?? null,
        phone: params.phone ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contacts.id, params.existingContactId),
          eq(contacts.workspaceId, params.workspaceId),
        ),
      )
      .returning({ id: contacts.id });

    if (updatedContact) {
      return updatedContact.id;
    }
  }

  const [createdContact] = await client
    .insert(contacts)
    .values({
      workspaceId: params.workspaceId,
      userId: params.userId,
      accountId: params.accountId ?? null,
      fullName: params.fullName,
      email: params.email ?? null,
      phone: params.phone ?? null,
    })
    .returning({ id: contacts.id });

  return createdContact?.id ?? null;
}

async function saveLeadDeal(params: {
  client?: DbClient;
  workspaceId: string;
  userId: string;
  leadId: string;
  accountId?: string | null;
  contactId?: string | null;
  ownerUserId?: string | null;
  dealName?: string;
  dealStage: DealStage;
  dealValue: number;
  dealCurrency: string;
  dealProbability: number;
  expectedCloseDate?: string;
  closedDate?: string;
  lostReason?: string;
}) {
  const client = params.client ?? db;

  if (!params.dealName) return null;

  const dealProbability = normalizeDealProbability(
    params.dealStage,
    params.dealProbability,
  );

  const [existingDeal] = await client
    .select({
      id: deals.id,
      stage: deals.stage,
      closedAt: deals.closedAt,
    })
    .from(deals)
    .where(and(eq(deals.leadId, params.leadId), eq(deals.workspaceId, params.workspaceId)))
    .limit(1);

  if (existingDeal) {
    const [updatedDeal] = await client
      .update(deals)
      .set({
        accountId: params.accountId ?? null,
        contactId: params.contactId ?? null,
        ownerUserId: params.ownerUserId ?? null,
        name: params.dealName,
        stage: params.dealStage,
        valueCents: moneyToCents(params.dealValue),
        currency: params.dealCurrency,
        probability: dealProbability,
        expectedCloseAt: parseDateInput(params.expectedCloseDate),
        closedAt: resolveClosedAt({
          stage: params.dealStage,
          closedDate: params.closedDate,
          existingClosedAt: existingDeal.closedAt,
        }),
        lostReason: params.dealStage === "lost" ? params.lostReason ?? null : null,
        updatedAt: new Date(),
      })
      .where(and(eq(deals.id, existingDeal.id), eq(deals.workspaceId, params.workspaceId)))
      .returning({ id: deals.id, stage: deals.stage });

    return {
      id: updatedDeal?.id ?? existingDeal.id,
      previousStage: existingDeal.stage,
      stage: updatedDeal?.stage ?? params.dealStage,
    };
  }

  const [createdDeal] = await client
    .insert(deals)
    .values({
      workspaceId: params.workspaceId,
      userId: params.userId,
      ownerUserId: params.ownerUserId ?? null,
      leadId: params.leadId,
      accountId: params.accountId ?? null,
      contactId: params.contactId ?? null,
      name: params.dealName,
      stage: params.dealStage,
      valueCents: moneyToCents(params.dealValue),
      currency: params.dealCurrency,
      probability: dealProbability,
      expectedCloseAt: parseDateInput(params.expectedCloseDate),
      closedAt: resolveClosedAt({
        stage: params.dealStage,
        closedDate: params.closedDate,
      }),
      lostReason: params.dealStage === "lost" ? params.lostReason ?? null : null,
    })
    .returning({ id: deals.id, stage: deals.stage });

  return {
    id: createdDeal?.id ?? null,
    previousStage: null,
    stage: createdDeal?.stage ?? params.dealStage,
  };
}

async function createLeadActivity(params: {
  workspaceId: string;
  userId: string;
  eventType: LeadActivityEventType;
  message: string;
  leadId?: string | null;
  leadName?: string | null;
}) {
  try {
    await db.insert(activityEvents).values({
      workspaceId: params.workspaceId,
      userId: params.userId,
      eventType: params.eventType,
      message: params.message,
      leadId: params.leadId ?? null,
      leadName: params.leadName ?? null,
    });
  } catch {
    // Activity logging should not block lead mutations.
  }
}

async function ensureLeadMutationAllowed() {
  return protectLeadMutation();
}

function workspacePermissionError(
  role: "owner" | "admin" | "member",
  permission: WorkspacePermission,
) {
  return hasWorkspacePermission(role, permission)
    ? null
    : permissionDeniedMessage(permission);
}

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

  try {
    const reconciled = reconcileLeadAndDealStage(
      parsed.data.status,
      parsed.data.dealStage,
    );
    const { createdLead, createdDeal } = await db.transaction(async (tx) => {
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
      });

      return { createdLead: lead, createdDeal: deal };
    });

    await createLeadActivity({
      workspaceId: workspace.id,
      userId,
      eventType: "lead_created",
      message: `Lead created: ${createdLead.fullName}`,
      leadId: createdLead.id,
      leadName: createdLead.fullName,
    });

    if (createdDeal?.id) {
      await createLeadActivity({
        workspaceId: workspace.id,
        userId,
        eventType: "deal_stage_changed",
        message: `Opportunity opened: ${parsed.data.dealName} (${reconciled.dealStage})`,
        leadId: createdLead.id,
        leadName: createdLead.fullName,
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/activity");

    return {
      success: true,
      leadId: createdLead.id,
      message: "Lead created successfully.",
    };
  } catch {
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
  if (!isUuid(leadId)) {
    return {
      success: false,
      message: "This lead could not be found.",
    };
  }

  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();
  const parsed = leadFormSchema.safeParse(input);

  const permissionError = workspacePermissionError(workspace.role, "crm:update");
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
        status: leads.status,
        accountId: leads.accountId,
        primaryContactId: leads.primaryContactId,
        assignedOwnerUserId: leads.assignedOwnerUserId,
      })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspace.id)))
      .limit(1);

    if (!existingLead) {
      return {
        success: false,
        message: "This lead could not be found.",
      };
    }

    const reconciled = reconcileLeadAndDealStage(
      parsed.data.status,
      parsed.data.dealStage,
    );
    const { updatedLead, savedDeal } = await db.transaction(async (tx) => {
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
        .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspace.id)))
        .returning({
          id: leads.id,
          fullName: leads.fullName,
          status: leads.status,
        });

      if (!lead) {
        return {
          updatedLead: null,
          savedDeal: null,
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
      });

      const notificationUserId = existingLead.assignedOwnerUserId ?? userId;
      if (
        deal?.id &&
        deal.previousStage &&
        deal.previousStage !== deal.stage &&
        notificationUserId !== userId
      ) {
        await createNotification({
          client: tx,
          workspaceId: workspace.id,
          userId: notificationUserId,
          type: "deal_stage_changed",
          title: "Deal stage updated",
          message: `${parsed.data.dealName} moved to ${DEAL_STAGE_LABELS[deal.stage]}.`,
          actionUrl: `/dashboard/leads/${leadId}#lead-deal`,
          metadata: { entityType: "deal", entityId: deal.id },
          dedupeKey: `deal-stage:${deal.id}:${deal.stage}`,
        });
      }

      return { updatedLead: lead, savedDeal: deal };
    });

    if (!updatedLead) {
      return {
        success: false,
        message: "This lead could not be found.",
      };
    }

    const statusChanged = existingLead.status !== updatedLead.status;

    await createLeadActivity({
      workspaceId: workspace.id,
      userId,
      eventType: statusChanged ? "lead_status_changed" : "lead_updated",
      message: statusChanged
        ? `Lead status changed: ${updatedLead.fullName} (${existingLead.status} -> ${updatedLead.status})`
        : `Lead updated: ${updatedLead.fullName}`,
      leadId: updatedLead.id,
      leadName: updatedLead.fullName,
    });

    if (savedDeal?.previousStage && savedDeal.previousStage !== savedDeal.stage) {
      await createLeadActivity({
        workspaceId: workspace.id,
        userId,
        eventType: "deal_stage_changed",
        message: `Deal stage changed: ${parsed.data.dealName} (${savedDeal.previousStage} -> ${savedDeal.stage})`,
        leadId: updatedLead.id,
        leadName: updatedLead.fullName,
      });
    }

    if (updatedLead.status === "Interested" && existingLead.status !== "Interested") {
      await createLeadActivity({
        workspaceId: workspace.id,
        userId,
        eventType: "lead_qualified",
        message: `Lead qualified: ${updatedLead.fullName}`,
        leadId: updatedLead.id,
        leadName: updatedLead.fullName,
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

export async function updateLeadStatusQuickAction(
  leadId: string,
  status: string,
): Promise<LeadQuickStatusState> {
  if (!isUuid(leadId)) {
    return {
      success: false,
      message: "This lead could not be found.",
    };
  }

  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();

  const permissionError = workspacePermissionError(workspace.role, "crm:update");
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
      .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspace.id)))
      .limit(1);

    if (!existingLead) {
      return {
        success: false,
        message: "This lead could not be found.",
      };
    }

    if (existingLead.status === status) {
      return {
        success: true,
        status,
        message: `Lead is already in ${status}.`,
      };
    }

    const syncedDealStage = dealStageForLeadStatus(status);
    const { updatedLead, updatedDeal } = await db.transaction(async (tx) => {
      const [lead] = await tx
        .update(leads)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspace.id)))
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

export async function updateDealStageAction(
  leadId: string,
  dealId: string,
  stage: string,
): Promise<DealStageMutationState> {
  if (!isUuid(leadId) || !isUuid(dealId)) {
    return {
      success: false,
      message: "This opportunity could not be found.",
    };
  }

  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();

  const permissionError = workspacePermissionError(workspace.role, "crm:update");
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

    if (existingDeal.stage === stage) {
      return {
        success: true,
        stage,
        message: `Deal is already in ${stage}.`,
      };
    }

    const syncedLeadStatus = leadStatusForDealStage(stage);
    const { updatedDeal, updatedLead } = await db.transaction(async (tx) => {
      const [deal] = await tx
        .update(deals)
        .set({
          stage,
          probability: normalizeDealProbability(stage, existingDeal.probability),
          closedAt: stage === "won" || stage === "lost" ? new Date() : null,
          lostReason: null,
          updatedAt: new Date(),
        })
        .where(and(eq(deals.id, dealId), eq(deals.workspaceId, workspace.id)))
        .returning({ stage: deals.stage });

      const notificationUserId =
        existingDeal.ownerUserId ?? existingDeal.assignedOwnerUserId;
      if (deal && notificationUserId && notificationUserId !== userId) {
        await createNotification({
          client: tx,
          workspaceId: workspace.id,
          userId: notificationUserId,
          type: "deal_stage_changed",
          title: "Deal stage updated",
          message: `${existingDeal.name} moved to ${DEAL_STAGE_LABELS[deal.stage]}.`,
          actionUrl: `/dashboard/leads/${leadId}#lead-deal`,
          metadata: { entityType: "deal", entityId: dealId },
          dedupeKey: `deal-stage:${dealId}:${deal.stage}`,
        });
      }

      if (!deal || !syncedLeadStatus || existingDeal.leadStatus === syncedLeadStatus) {
        return { updatedDeal: deal ?? null, updatedLead: null };
      }

      const [lead] = await tx
        .update(leads)
        .set({
          status: syncedLeadStatus,
          updatedAt: new Date(),
        })
        .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspace.id)))
        .returning({ status: leads.status });

      return { updatedDeal: deal, updatedLead: lead ?? null };
    });

    if (!updatedDeal) {
      return {
        success: false,
        message: "This opportunity could not be found.",
      };
    }

    await createLeadActivity({
      workspaceId: workspace.id,
      userId,
      eventType: "deal_stage_changed",
      message: `Deal stage changed: ${existingDeal.name} (${existingDeal.stage} -> ${updatedDeal.stage})`,
      leadId,
      leadName: existingDeal.leadName,
    });

    if (updatedLead) {
      await createLeadActivity({
        workspaceId: workspace.id,
        userId,
        eventType: "lead_status_changed",
        message: `Lead status changed: ${existingDeal.leadName} (${existingDeal.leadStatus} -> ${updatedLead.status})`,
        leadId,
        leadName: existingDeal.leadName,
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

export async function updateLeadFollowUpAction(
  leadId: string,
  input: LeadFollowUpValues,
): Promise<LeadFollowUpMutationState> {
  if (!isUuid(leadId)) {
    return {
      success: false,
      message: "This lead could not be found.",
    };
  }

  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();
  const parsed = leadFollowUpSchema.safeParse(input);

  const permissionError = workspacePermissionError(workspace.role, "crm:update");
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
        nextFollowUpDate: leads.nextFollowUpDate,
        followUpNote: leads.followUpNote,
      })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspace.id)))
      .limit(1);

    if (!existingLead) {
      return {
        success: false,
        message: "This lead could not be found.",
      };
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
      .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspace.id)));

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

export async function createFollowUpTaskAction(
  leadId: string,
  input: CrmTaskFormValues,
): Promise<CrmTaskMutationState> {
  if (!isUuid(leadId)) {
    return {
      success: false,
      message: "This lead could not be found.",
    };
  }

  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();
  const parsed = crmTaskFormSchema.safeParse(input);

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
      message: "Please review the task and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const [lead] = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
        primaryContactId: leads.primaryContactId,
        assignedOwnerUserId: leads.assignedOwnerUserId,
      })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspace.id)))
      .limit(1);

    if (!lead) {
      return {
        success: false,
        message: "This lead could not be found.",
      };
    }

    const [leadDeal] = await db
      .select({ id: deals.id })
      .from(deals)
      .where(and(eq(deals.leadId, leadId), eq(deals.workspaceId, workspace.id)))
      .limit(1);

    const dueAt = parseTaskDueAt(parsed.data.dueDate);

    await db.transaction(async (tx) => {
      const [task] = await tx
        .insert(crmTasks)
        .values({
          workspaceId: workspace.id,
          userId,
          ownerUserId: lead.assignedOwnerUserId ?? userId,
          leadId,
          dealId: leadDeal?.id ?? null,
          contactId: lead.primaryContactId,
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          dueAt,
          status: getInitialTaskStatus(dueAt),
          priority: parsed.data.priority,
        })
        .returning({ id: crmTasks.id });

      const notificationUserId = lead.assignedOwnerUserId ?? userId;
      if (!task || notificationUserId === userId) return;

      const actionUrl = `/dashboard/leads/${leadId}#lead-tasks`;
      const metadata = { entityType: "task", entityId: task.id };

      await createNotification({
        client: tx,
        workspaceId: workspace.id,
        userId: notificationUserId,
        type: "task_assigned",
        title: "Task assigned",
        message: `${parsed.data.title} was assigned to you for ${lead.fullName}.`,
        actionUrl,
        metadata,
        dedupeKey: `task-assigned:${task.id}`,
      });

      const taskBucket = getTaskTimelineBucket(
        { dueAt, status: "pending", completedAt: null },
        getLocalDateKey(),
      );
      const dueNotificationType =
        taskBucket === "overdue"
          ? "task_overdue"
          : taskBucket === "dueToday"
            ? "task_due"
            : null;

      if (!dueNotificationType) return;

      await createNotification({
        client: tx,
        workspaceId: workspace.id,
        userId: notificationUserId,
        type: dueNotificationType,
        title: dueNotificationType === "task_overdue" ? "Task overdue" : "Task due today",
        message:
          dueNotificationType === "task_overdue"
            ? `${parsed.data.title} is already past its due date.`
            : `${parsed.data.title} is due today.`,
        actionUrl,
        metadata,
        dedupeKey: `${dueNotificationType}:${task.id}`,
      });
    });

    await createLeadActivity({
      workspaceId: workspace.id,
      userId,
      eventType: "task_created",
      message: `Task created for ${lead.fullName}: ${parsed.data.title}`,
      leadId,
      leadName: lead.fullName,
    });

    revalidateLeadPaths(leadId);

    return {
      success: true,
      message: "Follow-up task created.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn't create this task right now. Please try again.",
    };
  }
}

export async function completeFollowUpTaskAction(
  leadId: string,
  taskId: string,
): Promise<CrmTaskMutationState> {
  if (!isUuid(leadId) || !isUuid(taskId)) {
    return {
      success: false,
      message: "This task could not be found.",
    };
  }

  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();

  const permissionError = workspacePermissionError(workspace.role, "crm:update");
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
    const [lead] = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
      })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspace.id)))
      .limit(1);

    if (!lead) {
      return {
        success: false,
        message: "This lead could not be found.",
      };
    }

    const [task] = await db
      .select({
        id: crmTasks.id,
        title: crmTasks.title,
        status: crmTasks.status,
      })
      .from(crmTasks)
      .where(
        and(
          eq(crmTasks.id, taskId),
          eq(crmTasks.leadId, leadId),
          eq(crmTasks.workspaceId, workspace.id),
        ),
      )
      .limit(1);

    if (!task) {
      return {
        success: false,
        message: "This task could not be found.",
      };
    }

    if (task.status === "completed") {
      return {
        success: true,
        message: "Task is already completed.",
      };
    }

    const [completedTask] = await db
      .update(crmTasks)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(crmTasks.id, taskId),
          eq(crmTasks.leadId, leadId),
          eq(crmTasks.workspaceId, workspace.id),
        ),
      )
      .returning({
        id: crmTasks.id,
        title: crmTasks.title,
      });

    if (!completedTask) {
      return {
        success: false,
        message: "This task could not be found.",
      };
    }

    await createLeadActivity({
      workspaceId: workspace.id,
      userId,
      eventType: "task_completed",
      message: `Task completed for ${lead.fullName}: ${completedTask.title}`,
      leadId,
      leadName: lead.fullName,
    });

    revalidateLeadPaths(leadId);

    return {
      success: true,
      message: "Task marked complete.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn't complete this task right now. Please try again.",
    };
  }
}

export async function deleteLeadAction(
  leadId: string,
): Promise<DeleteLeadActionState> {
  if (!isUuid(leadId)) {
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
    const [archivedLead] = await db
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

    if (!archivedLead) {
      return {
        success: false,
        message: "This lead could not be found or you do not have access to it.",
      };
    }

    await createLeadActivity({
      workspaceId: workspace.id,
      userId,
      eventType: "lead_archived",
      message: `Lead archived: ${archivedLead.fullName}`,
      leadId: archivedLead.id,
      leadName: archivedLead.fullName,
    });

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
  if (!isUuid(leadId)) {
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
    const [restoredLead] = await db
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

    if (!restoredLead) {
      return {
        success: false,
        message: "This lead could not be found or you do not have access to it.",
      };
    }

    await createLeadActivity({
      workspaceId: workspace.id,
      userId,
      eventType: "lead_restored",
      message: `Lead restored: ${restoredLead.fullName}`,
      leadId: restoredLead.id,
      leadName: restoredLead.fullName,
    });

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

export async function bulkUpdateLeadStatusAction(
  leadIds: string[],
  status: string,
): Promise<BulkLeadActionState> {
  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();
  const normalizedIds = normalizeLeadIds(leadIds);

  const permissionError = workspacePermissionError(workspace.role, "crm:update");
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

  try {
    const ownedLeads = await db
      .select({
        id: leads.id,
        status: leads.status,
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

    const leadIdsToUpdate = ownedLeads
      .filter((lead) => lead.status !== status)
      .map((lead) => lead.id);

    if (leadIdsToUpdate.length === 0) {
      return {
        success: true,
        affectedCount: 0,
        message: `Selected leads are already in ${status}.`,
      };
    }

    await db
      .update(leads)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(leads.workspaceId, workspace.id),
          eq(leads.isArchived, false),
          inArray(leads.id, leadIdsToUpdate),
        ),
      );

    await createLeadActivity({
      workspaceId: workspace.id,
      userId,
      eventType: "lead_status_changed",
      message: `${leadIdsToUpdate.length} lead${leadIdsToUpdate.length === 1 ? "" : "s"} moved to ${status}.`,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/activity");

    return {
      success: true,
      affectedCount: leadIdsToUpdate.length,
      message: `${leadIdsToUpdate.length} lead${leadIdsToUpdate.length === 1 ? "" : "s"} updated to ${status}.`,
    };
  } catch {
    return {
      success: false,
      message: "We couldn't update the selected leads right now. Please try again.",
    };
  }
}

export async function bulkDeleteLeadsAction(
  leadIds: string[],
): Promise<BulkLeadActionState> {
  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();
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

  try {
    const archivedLeads = await db
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

    const affectedCount = archivedLeads.length;

    if (affectedCount === 0) {
      return {
        success: false,
        message: "No matching leads were found.",
      };
    }

    await createLeadActivity({
      workspaceId: workspace.id,
      userId,
      eventType: "lead_archived",
      message: `${affectedCount} lead${affectedCount === 1 ? "" : "s"} archived in bulk.`,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/activity");

    return {
      success: true,
      affectedCount,
      message: `${affectedCount} lead${affectedCount === 1 ? "" : "s"} archived successfully.`,
    };
  } catch {
    return {
      success: false,
      message: "We couldn't archive the selected leads right now. Please try again.",
    };
  }
}

export async function createLeadNoteAction(
  leadId: string,
  content: string,
): Promise<LeadNoteMutationState> {
  if (!isUuid(leadId)) {
    return {
      success: false,
      message: "This lead could not be found.",
    };
  }

  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();
  const parsed = leadNoteSchema.safeParse({ content });

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
      message: "Please review your note and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const [lead] = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
      })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspace.id)))
      .limit(1);

    if (!lead) {
      return {
        success: false,
        message: "This lead could not be found.",
      };
    }

    await db.insert(leadNotes).values({
      workspaceId: workspace.id,
      userId,
      leadId,
      content: parsed.data.content,
    });

    await createLeadActivity({
      workspaceId: workspace.id,
      userId,
      eventType: "lead_note_added",
      message: `Note added to ${lead.fullName}`,
      leadId: lead.id,
      leadName: lead.fullName,
    });

    revalidateLeadPaths(leadId);

    return {
      success: true,
      message: "Note added.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn't save this note right now. Please try again.",
    };
  }
}

export async function updateLeadNoteAction(
  leadId: string,
  noteId: string,
  content: string,
): Promise<LeadNoteMutationState> {
  if (!isUuid(leadId) || !isUuid(noteId)) {
    return {
      success: false,
      message: "This note could not be found.",
    };
  }

  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();
  const parsed = leadNoteSchema.safeParse({ content });

  const permissionError = workspacePermissionError(workspace.role, "crm:update");
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
      message: "Please review your note and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const [lead] = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
      })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspace.id)))
      .limit(1);

    if (!lead) {
      return {
        success: false,
        message: "This lead could not be found.",
      };
    }

    const [updatedNote] = await db
      .update(leadNotes)
      .set({
        content: parsed.data.content,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(leadNotes.id, noteId),
          eq(leadNotes.leadId, leadId),
          eq(leadNotes.workspaceId, workspace.id),
        ),
      )
      .returning({ id: leadNotes.id });

    if (!updatedNote) {
      return {
        success: false,
        message: "This note could not be found.",
      };
    }

    await createLeadActivity({
      workspaceId: workspace.id,
      userId,
      eventType: "lead_note_updated",
      message: `Note updated for ${lead.fullName}`,
      leadId: lead.id,
      leadName: lead.fullName,
    });

    revalidateLeadPaths(leadId);

    return {
      success: true,
      message: "Note updated.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn't update this note right now. Please try again.",
    };
  }
}

export async function deleteLeadNoteAction(
  leadId: string,
  noteId: string,
): Promise<LeadNoteMutationState> {
  if (!isUuid(leadId) || !isUuid(noteId)) {
    return {
      success: false,
      message: "This note could not be found.",
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
    const [lead] = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
      })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspace.id)))
      .limit(1);

    if (!lead) {
      return {
        success: false,
        message: "This lead could not be found.",
      };
    }

    const [deletedNote] = await db
      .delete(leadNotes)
      .where(
        and(
          eq(leadNotes.id, noteId),
          eq(leadNotes.leadId, leadId),
          eq(leadNotes.workspaceId, workspace.id),
        ),
      )
      .returning({ id: leadNotes.id });

    if (!deletedNote) {
      return {
        success: false,
        message: "This note could not be found.",
      };
    }

    await createLeadActivity({
      workspaceId: workspace.id,
      userId,
      eventType: "lead_note_deleted",
      message: `Note removed from ${lead.fullName}`,
      leadId: lead.id,
      leadName: lead.fullName,
    });

    revalidateLeadPaths(leadId);

    return {
      success: true,
      message: "Note deleted.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn't delete this note right now. Please try again.",
    };
  }
}
