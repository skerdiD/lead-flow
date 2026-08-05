import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  activityEvents,
  contacts,
  crmTasks,
  deals,
  leadNotes,
  leads,
  type activityEventTypes,
} from "@/db/schema";
import { isUuid } from "@/lib/uuid";
import {
  getCurrentWorkspaceAuthorizationContext,
  getRecordVisibilityConditions,
  getTaskVisibilityConditions,
  hasWorkspacePermission,
} from "@/lib/authorization";
import {
  getWorkspaceMemberOptions,
  type WorkspaceMemberOption,
} from "@/lib/workspace-member-profiles.server";

export type LeadDetailsResult = {
  id: string;
  fullName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: "New" | "Contacted" | "Interested" | "Proposal Sent" | "Closed" | "Lost";
  source: string | null;
  notes: string | null;
  nextFollowUpDate: Date | null;
  followUpNote: string | null;
  followUpPriority: "low" | "medium" | "high";
  followUpStatus: "pending" | "completed" | "rescheduled";
  isArchived: boolean;
  archivedAt: Date | null;
  assignedOwnerUserId: string | null;
  accountId: string | null;
  accountName: string | null;
  primaryContactId: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactPhone: string | null;
  jobTitle: string | null;
  createdAt: Date;
  updatedAt: Date;
  viewerUserId: string;
  owner: WorkspaceMemberOption | null;
  ownerOptions: WorkspaceMemberOption[];
  noteEntries: Array<{
    id: string;
    content: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  activityEntries: Array<{
    id: string;
    eventType: (typeof activityEventTypes)[number];
    message: string;
    metadata: Record<string, string> | null;
    createdAt: Date;
  }>;
  taskEntries: Array<{
    id: string;
    title: string;
    description: string | null;
    dueAt: Date | null;
    status: "pending" | "completed";
    priority: "low" | "medium" | "high";
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  dealEntry: {
    id: string;
    name: string;
    stage: "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
    valueCents: number;
    currency: string;
    probability: number;
    expectedCloseAt: Date | null;
    closedAt: Date | null;
    lostReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
};

export async function getLeadDetails(
  leadId: string,
): Promise<LeadDetailsResult | null> {
  if (!isUuid(leadId)) {
    return null;
  }

  const context = await getCurrentWorkspaceAuthorizationContext();

  const [lead] = await db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      company: leads.company,
      email: leads.email,
      phone: leads.phone,
      status: leads.status,
      source: leads.source,
      notes: leads.notes,
      nextFollowUpDate: leads.nextFollowUpDate,
      followUpNote: leads.followUpNote,
      followUpPriority: leads.followUpPriority,
      followUpStatus: leads.followUpStatus,
      isArchived: leads.isArchived,
      archivedAt: leads.archivedAt,
      assignedOwnerUserId: leads.assignedOwnerUserId,
      accountId: leads.accountId,
      accountName: accounts.name,
      primaryContactId: leads.primaryContactId,
      primaryContactName: contacts.fullName,
      primaryContactEmail: contacts.email,
      primaryContactPhone: contacts.phone,
      jobTitle: contacts.title,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .leftJoin(
      accounts,
      and(eq(leads.accountId, accounts.id), eq(accounts.workspaceId, context.workspaceId)),
    )
    .leftJoin(
      contacts,
      and(
        eq(leads.primaryContactId, contacts.id),
        eq(contacts.workspaceId, context.workspaceId),
      ),
    )
    .where(
      and(
        eq(leads.id, leadId),
        ...getRecordVisibilityConditions(
          context,
          leads.workspaceId,
          leads.assignedOwnerUserId,
        ),
      ),
    )
    .limit(1);

  if (!lead) {
    return null;
  }

  const [noteEntries, activityEntries, taskEntries, dealEntry, ownerOptions] = await Promise.all([
    db
      .select({
        id: leadNotes.id,
        content: leadNotes.content,
        userId: leadNotes.userId,
        createdAt: leadNotes.createdAt,
        updatedAt: leadNotes.updatedAt,
      })
      .from(leadNotes)
      .where(
        and(eq(leadNotes.leadId, leadId), eq(leadNotes.workspaceId, context.workspaceId)),
      )
      .orderBy(desc(leadNotes.createdAt)),
    db
      .select({
        id: activityEvents.id,
        eventType: activityEvents.eventType,
        message: activityEvents.message,
        metadata: activityEvents.metadata,
        createdAt: activityEvents.createdAt,
      })
      .from(activityEvents)
      .where(
        and(
          eq(activityEvents.leadId, leadId),
          eq(activityEvents.workspaceId, context.workspaceId),
        ),
      )
      .orderBy(desc(activityEvents.createdAt))
      .limit(12),
    db
      .select({
        id: crmTasks.id,
        title: crmTasks.title,
        description: crmTasks.description,
        dueAt: crmTasks.dueAt,
        status: crmTasks.status,
        priority: crmTasks.priority,
        completedAt: crmTasks.completedAt,
        createdAt: crmTasks.createdAt,
        updatedAt: crmTasks.updatedAt,
      })
      .from(crmTasks)
      .where(
        and(
          eq(crmTasks.leadId, leadId),
          ...getTaskVisibilityConditions(
            context,
            crmTasks.workspaceId,
            crmTasks.ownerUserId,
            crmTasks.userId,
          ),
        ),
      )
      .orderBy(desc(crmTasks.createdAt)),
    db
      .select({
        id: deals.id,
        name: deals.name,
        stage: deals.stage,
        valueCents: deals.valueCents,
        currency: deals.currency,
        probability: deals.probability,
        expectedCloseAt: deals.expectedCloseAt,
        closedAt: deals.closedAt,
        lostReason: deals.lostReason,
        createdAt: deals.createdAt,
        updatedAt: deals.updatedAt,
      })
      .from(deals)
      .where(
        and(
          eq(deals.leadId, leadId),
          ...getRecordVisibilityConditions(
            context,
            deals.workspaceId,
            deals.ownerUserId,
          ),
        ),
      )
      .limit(1),
    getWorkspaceMemberOptions(
      context.workspaceId,
      hasWorkspacePermission(context.role, "crm:assign")
        ? undefined
        : lead.assignedOwnerUserId
          ? [lead.assignedOwnerUserId]
          : [],
    ),
  ]);

  const owner = lead.assignedOwnerUserId
    ? ownerOptions.find((member) => member.userId === lead.assignedOwnerUserId) ?? {
        userId: lead.assignedOwnerUserId,
        name: "Unknown member",
        imageUrl: null,
      }
    : null;

  return {
    ...lead,
    viewerUserId: context.userId,
    owner,
    ownerOptions,
    noteEntries,
    activityEntries,
    taskEntries,
    dealEntry: dealEntry[0] ?? null,
  };
}
