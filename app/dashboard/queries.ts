import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { requireUserId } from "@/lib/auth";

export async function getDashboardStats() {
  const userId = await requireUserId();

  const [stats] = await db
    .select({
      totalLeads: sql<number>`count(*)`,
      newLeads: sql<number>`count(*) filter (where ${leads.status} = 'New')`,
      interestedLeads: sql<number>`count(*) filter (where ${leads.status} = 'Interested')`,
      closedLeads: sql<number>`count(*) filter (where ${leads.status} = 'Closed')`,
    })
    .from(leads)
    .where(eq(leads.userId, userId));

  return {
    totalLeads: Number(stats?.totalLeads ?? 0),
    newLeads: Number(stats?.newLeads ?? 0),
    interestedLeads: Number(stats?.interestedLeads ?? 0),
    closedLeads: Number(stats?.closedLeads ?? 0),
  };
}

export async function getRecentLeads(limit = 5) {
  const userId = await requireUserId();

  return db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      company: leads.company,
      status: leads.status,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(eq(leads.userId, userId))
    .orderBy(desc(leads.createdAt))
    .limit(limit);
}