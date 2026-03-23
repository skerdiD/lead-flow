import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activityEvents, leadNotes, leads } from "@/db/schema";
import { requireUserId } from "@/lib/auth";

export async function getLeadDetails(leadId: string) {
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
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.userId, userId)))
    .limit(1);

  if (!lead) {
    return null;
  }

  const noteEntries = await db
    .select({
      id: leadNotes.id,
      content: leadNotes.content,
      createdAt: leadNotes.createdAt,
      updatedAt: leadNotes.updatedAt,
    })
    .from(leadNotes)
    .where(and(eq(leadNotes.leadId, leadId), eq(leadNotes.userId, userId)))
    .orderBy(desc(leadNotes.createdAt));

  const activityEntries = await db
    .select({
      id: activityEvents.id,
      eventType: activityEvents.eventType,
      message: activityEvents.message,
      createdAt: activityEvents.createdAt,
    })
    .from(activityEvents)
    .where(and(eq(activityEvents.leadId, leadId), eq(activityEvents.userId, userId)))
    .orderBy(desc(activityEvents.createdAt))
    .limit(8);

  return {
    ...lead,
    noteEntries,
    activityEntries,
  };
}
