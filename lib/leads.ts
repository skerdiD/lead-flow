import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";

export function whereLeadsBelongToUser(userId: string) {
  return eq(leads.userId, userId);
}

export function whereOwnedLead(userId: string, leadId: string) {
  return and(eq(leads.userId, userId), eq(leads.id, leadId));
}

export async function findOwnedLeadById(userId: string, leadId: string) {
  return db.query.leads.findFirst({
    where: whereOwnedLead(userId, leadId),
  });
}