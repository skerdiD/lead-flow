import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { requireUserId } from "@/lib/auth";

export async function getDashboardOverview() {
  const userId = await requireUserId();

  const [stats] = await db
    .select({
      totalLeads: sql<number>`count(*)`,
      newLeads: sql<number>`count(*) filter (where ${leads.status} = 'New')`,
      activePipeline: sql<number>`count(*) filter (where ${leads.status} in ('Contacted', 'Interested', 'Proposal Sent'))`,
      closedDeals: sql<number>`count(*) filter (where ${leads.status} = 'Closed')`,
    })
    .from(leads)
    .where(eq(leads.userId, userId));

  return {
    totalLeads: Number(stats?.totalLeads ?? 0),
    newLeads: Number(stats?.newLeads ?? 0),
    activePipeline: Number(stats?.activePipeline ?? 0),
    closedDeals: Number(stats?.closedDeals ?? 0),
  };
}