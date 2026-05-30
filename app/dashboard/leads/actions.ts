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
import { requireUserId } from "@/lib/auth";
import {
  DEAL_STAGES,
  type DealStage,
} from "@/lib/constants/crm";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/constants/leads";
import {
  crmTaskFormSchema,
  type CrmTaskFormValues,
} from "@/lib/validations/crm-task";
import { leadNoteSchema } from "@/lib/validations/lead-note";
import { leadFormSchema, type LeadFormValues } from "@/lib/validations/lead";
import { isUuid, normalizeUuidList } from "@/lib/uuid";
import { getCurrentWorkspace } from "@/lib/workspaces";

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

type LeadActivityEventType =
  | "lead_created"
  | "lead_updated"
  | "lead_status_changed"
  | "lead_deleted"
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

function getInitialTaskStatus(dueAt: Date | null) {
  return dueAt && dueAt.getTime() < Date.now() ? "overdue" : "pending";
}

function revalidateLeadPaths(leadId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/activity");
  revalidatePath(`/dashboard/leads/${leadId}`);
  revalidatePath(`/dashboard/leads/${leadId}/edit`);
}

async function saveLeadAccount(params: {
  workspaceId: string;
  userId: string;
  existingAccountId?: string | null;
  company?: string;
}) {
  if (!params.company) return null;

  if (params.existingAccountId) {
    const [updatedAccount] = await db
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

  const [createdAccount] = await db
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
  workspaceId: string;
  userId: string;
  existingContactId?: string | null;
  accountId?: string | null;
  fullName: string;
  email?: string;
  phone?: string;
}) {
  if (params.existingContactId) {
    const [updatedContact] = await db
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

  const [createdContact] = await db
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
  workspaceId: string;
  userId: string;
  leadId: string;
  accountId?: string | null;
  contactId?: string | null;
  ownerUserId?: string | null;
  dealName?: string;
  dealStage: DealStage;
}) {
  if (!params.dealName) return null;

  const [existingDeal] = await db
    .select({
      id: deals.id,
      stage: deals.stage,
    })
    .from(deals)
    .where(and(eq(deals.leadId, params.leadId), eq(deals.workspaceId, params.workspaceId)))
    .limit(1);

  if (existingDeal) {
    const [updatedDeal] = await db
      .update(deals)
      .set({
        accountId: params.accountId ?? null,
        contactId: params.contactId ?? null,
        ownerUserId: params.ownerUserId ?? null,
        name: params.dealName,
        stage: params.dealStage,
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

  const [createdDeal] = await db
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

export async function createLeadAction(
  input: LeadFormValues,
): Promise<LeadMutationState> {
  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();
  const parsed = leadFormSchema.safeParse(input);

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
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
    const accountId = await saveLeadAccount({
      workspaceId: workspace.id,
      userId,
      company: parsed.data.company,
    });
    const contactId = await saveLeadContact({
      workspaceId: workspace.id,
      userId,
      accountId,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
    });

    const [createdLead] = await db
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
        status: parsed.data.status,
        source: parsed.data.source ?? null,
        notes: parsed.data.notes ?? null,
      })
      .returning({
        id: leads.id,
        fullName: leads.fullName,
      });

    const createdDeal = await saveLeadDeal({
      workspaceId: workspace.id,
      userId,
      leadId: createdLead.id,
      accountId,
      contactId,
      ownerUserId: userId,
      dealName: parsed.data.dealName,
      dealStage: parsed.data.dealStage,
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
        message: `Opportunity opened: ${parsed.data.dealName} (${parsed.data.dealStage})`,
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

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
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

    const accountId = await saveLeadAccount({
      workspaceId: workspace.id,
      userId,
      existingAccountId: existingLead.accountId,
      company: parsed.data.company,
    });
    const contactId = await saveLeadContact({
      workspaceId: workspace.id,
      userId,
      existingContactId: existingLead.primaryContactId,
      accountId,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
    });

    const [updatedLead] = await db
      .update(leads)
      .set({
        accountId,
        primaryContactId: contactId,
        assignedOwnerUserId: existingLead.assignedOwnerUserId ?? userId,
        fullName: parsed.data.fullName,
        company: parsed.data.company ?? null,
        email: parsed.data.email ?? null,
        phone: parsed.data.phone ?? null,
        status: parsed.data.status,
        source: parsed.data.source ?? null,
        notes: parsed.data.notes ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspace.id)))
      .returning({
        id: leads.id,
        fullName: leads.fullName,
        status: leads.status,
      });

    if (!updatedLead) {
      return {
        success: false,
        message: "This lead could not be found.",
      };
    }

    const statusChanged = existingLead.status !== updatedLead.status;
    const savedDeal = await saveLeadDeal({
      workspaceId: workspace.id,
      userId,
      leadId,
      accountId,
      contactId,
      ownerUserId: existingLead.assignedOwnerUserId ?? userId,
      dealName: parsed.data.dealName,
      dealStage: parsed.data.dealStage,
    });

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

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
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

    const [updatedLead] = await db
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

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
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
        leadName: leads.fullName,
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

    const [updatedDeal] = await db
      .update(deals)
      .set({
        stage,
        updatedAt: new Date(),
      })
      .where(and(eq(deals.id, dealId), eq(deals.workspaceId, workspace.id)))
      .returning({ stage: deals.stage });

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

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
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

    await db.insert(crmTasks).values({
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

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
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

    const [completedTask] = await db
      .update(crmTasks)
      .set({
        status: "done",
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
      message: "Task marked done.",
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

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
    };
  }

  try {
    const [deletedLead] = await db
      .delete(leads)
      .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspace.id)))
      .returning({
        id: leads.id,
        fullName: leads.fullName,
      });

    if (!deletedLead) {
      return {
        success: false,
        message: "This lead could not be found or you do not have access to it.",
      };
    }

    await createLeadActivity({
      workspaceId: workspace.id,
      userId,
      eventType: "lead_deleted",
      message: `Lead deleted: ${deletedLead.fullName}`,
      leadId: deletedLead.id,
      leadName: deletedLead.fullName,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/activity");

    return {
      success: true,
      message: "Lead deleted successfully.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn't delete this lead right now. Please try again.",
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

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
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
      .where(and(eq(leads.workspaceId, workspace.id), inArray(leads.id, normalizedIds)));

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
      .where(and(eq(leads.workspaceId, workspace.id), inArray(leads.id, leadIdsToUpdate)));

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

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
    };
  }

  if (normalizedIds.length === 0) {
    return {
      success: false,
      message: "Select at least one lead to delete.",
    };
  }

  try {
    const deletedLeads = await db
      .delete(leads)
      .where(and(eq(leads.workspaceId, workspace.id), inArray(leads.id, normalizedIds)))
      .returning({
        id: leads.id,
      });

    const affectedCount = deletedLeads.length;

    if (affectedCount === 0) {
      return {
        success: false,
        message: "No matching leads were found.",
      };
    }

    await createLeadActivity({
      workspaceId: workspace.id,
      userId,
      eventType: "lead_deleted",
      message: `${affectedCount} lead${affectedCount === 1 ? "" : "s"} deleted in bulk.`,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/activity");

    return {
      success: true,
      affectedCount,
      message: `${affectedCount} lead${affectedCount === 1 ? "" : "s"} deleted successfully.`,
    };
  } catch {
    return {
      success: false,
      message: "We couldn't delete the selected leads right now. Please try again.",
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

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
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

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
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

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
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
