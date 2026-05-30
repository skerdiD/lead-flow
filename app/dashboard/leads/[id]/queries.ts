import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activityEvents, leadNotes, leads } from "@/db/schema";
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
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspace.id)))
    .limit(1);

  if (!lead) {
    return null;
  }

  const [noteEntries, activityEntries] = await Promise.all([
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
  ]);

  return {
    ...lead,
    noteEntries,
    activityEntries,
  };
}
