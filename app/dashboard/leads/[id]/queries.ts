import { and, desc, eq, isNull, or } from "drizzle-orm";
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
import { requireUserId } from "@/lib/auth";
import { getCurrentWorkspace } from "@/lib/workspaces";

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
  createdAt: Date;
  updatedAt: Date;
  viewerUserId: string;
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

  const workspace = await getCurrentWorkspace();
  const userId = await requireUserId();

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
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .leftJoin(
      accounts,
      and(eq(leads.accountId, accounts.id), eq(accounts.workspaceId, workspace.id)),
    )
    .leftJoin(
      contacts,
      and(
        eq(leads.primaryContactId, contacts.id),
        eq(contacts.workspaceId, workspace.id),
      ),
    )
    .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspace.id)))
    .limit(1);

  if (!lead) {
    return null;
  }

  const [noteEntries, activityEntries, taskEntries, dealEntry] = await Promise.all([
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
        and(eq(leadNotes.leadId, leadId), eq(leadNotes.workspaceId, workspace.id)),
      )
      .orderBy(desc(leadNotes.createdAt)),
    db
      .select({
        id: activityEvents.id,
        eventType: activityEvents.eventType,
        message: activityEvents.message,
        createdAt: activityEvents.createdAt,
      })
      .from(activityEvents)
      .where(
        and(
          eq(activityEvents.leadId, leadId),
          eq(activityEvents.workspaceId, workspace.id),
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
          eq(crmTasks.workspaceId, workspace.id),
          or(
            eq(crmTasks.ownerUserId, userId),
            and(isNull(crmTasks.ownerUserId), eq(crmTasks.userId, userId)),
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
      .where(and(eq(deals.leadId, leadId), eq(deals.workspaceId, workspace.id)))
      .limit(1),
  ]);

  return {
    ...lead,
    viewerUserId: userId,
    noteEntries,
    activityEntries,
    taskEntries,
    dealEntry: dealEntry[0] ?? null,
  };
}
