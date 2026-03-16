import { and, eq } from "drizzle-orm";
import { leads } from "@/db/schema";

export function whereUserOwnsLead(userId: string, leadId: string) {
  return and(eq(leads.userId, userId), eq(leads.id, leadId));
}

export function whereLeadsBelongToUser(userId: string) {
  return eq(leads.userId, userId);
}