import { and, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { whereLeadsBelongToUser, whereUserOwnsLead } from "@/lib/lead-scope";

export async function listLeadsForCurrentUser(search?: string) {
  const userId = await requireUserId();

  if (!search?.trim()) {
    return db.query.leads.findMany({
      where: whereLeadsBelongToUser(userId),
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
    });
  }

  const q = `%${search.trim()}%`;

  return db.query.leads.findMany({
    where: and(
      eq(leads.userId, userId),
      or(
        ilike(leads.fullName, q),
        ilike(leads.company, q),
        ilike(leads.email, q),
      ),
    ),
    orderBy: (table, { desc }) => [desc(table.updatedAt)],
  });
}

export async function getLeadForCurrentUser(leadId: string) {
  const userId = await requireUserId();

  return db.query.leads.findFirst({
    where: whereUserOwnsLead(userId, leadId),
  });
}

export async function createLeadForCurrentUser(input: {
  fullName: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: "New" | "Contacted" | "Interested" | "Proposal Sent" | "Closed" | "Lost";
  source?: string | null;
  notes?: string | null;
}) {
  const userId = await requireUserId();

  const [lead] = await db
    .insert(leads)
    .values({
      userId,
      fullName: input.fullName,
      company: input.company ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      status: input.status ?? "New",
      source: input.source ?? null,
      notes: input.notes ?? null,
    })
    .returning();

  return lead;
}

export async function updateLeadForCurrentUser(
  leadId: string,
  input: Partial<{
    fullName: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    status: "New" | "Contacted" | "Interested" | "Proposal Sent" | "Closed" | "Lost";
    source: string | null;
    notes: string | null;
  }>,
) {
  const userId = await requireUserId();

  const [lead] = await db
    .update(leads)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(whereUserOwnsLead(userId, leadId))
    .returning();

  return lead ?? null;
}

export async function deleteLeadForCurrentUser(leadId: string) {
  const userId = await requireUserId();

  const [lead] = await db
    .delete(leads)
    .where(whereUserOwnsLead(userId, leadId))
    .returning({ id: leads.id });

  return lead ?? null;
}