import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { leadNotes, leads } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ensureLeadNotesSchema } from "@/lib/lead-notes-schema";

export async function getLeadDetails(leadId: string) {
  const userId = await requireUserId();
  await ensureLeadNotesSchema();

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

  return {
    ...lead,
    noteEntries,
  };
}
