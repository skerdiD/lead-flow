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
} from "@/db/schema";
import { isUuid } from "@/lib/uuid";
import { getCurrentWorkspace } from "@/lib/workspaces";

export async function getLeadDetails(leadId: string) {
  if (!isUuid(leadId)) {
    return null;
  }

  const workspace = await getCurrentWorkspace();

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
      .limit(8),
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
      })
      .from(crmTasks)
      .where(and(eq(crmTasks.leadId, leadId), eq(crmTasks.workspaceId, workspace.id)))
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
    noteEntries,
    activityEntries,
    taskEntries,
    dealEntry: dealEntry[0] ?? null,
  };
}
