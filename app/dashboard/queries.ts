import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/constants/leads";

export type LeadPipelineDatum = {
  status: LeadStatus;
  leads: number;
  share: number;
};

export type SourcePerformanceDatum = {
  source: string;
  total: number;
  qualified: number;
  won: number;
  winRate: number;
};

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

export async function getLeadPipelineData() {
  const userId = await requireUserId();

  const rows = await db
    .select({
      status: leads.status,
      total: sql<number>`count(*)`,
    })
    .from(leads)
    .where(eq(leads.userId, userId))
    .groupBy(leads.status);

  const countByStatus = new Map<LeadStatus, number>();

  for (const row of rows) {
    countByStatus.set(row.status, Number(row.total ?? 0));
  }

  const totalLeads = Array.from(countByStatus.values()).reduce(
    (sum, count) => sum + count,
    0,
  );

  return LEAD_STATUSES.map((status) => {
    const count = countByStatus.get(status) ?? 0;

    return {
      status,
      leads: count,
      share: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
    } satisfies LeadPipelineDatum;
  });
}

export async function getSourcePerformanceData(limit = 6) {
  const userId = await requireUserId();
  const sourceLabel = sql<string>`coalesce(nullif(trim(${leads.source}), ''), 'Unspecified')`;

  const rows = await db
    .select({
      source: sourceLabel,
      total: sql<number>`count(*)`,
      qualified: sql<number>`count(*) filter (where ${leads.status} in ('Interested', 'Proposal Sent', 'Closed'))`,
      won: sql<number>`count(*) filter (where ${leads.status} = 'Closed')`,
    })
    .from(leads)
    .where(eq(leads.userId, userId))
    .groupBy(sourceLabel)
    .orderBy(desc(sql<number>`count(*)`))
    .limit(limit);

  return rows.map((row) => {
    const total = Number(row.total ?? 0);
    const won = Number(row.won ?? 0);

    return {
      source: row.source,
      total,
      qualified: Number(row.qualified ?? 0),
      won,
      winRate: total > 0 ? Math.round((won / total) * 100) : 0,
    } satisfies SourcePerformanceDatum;
  });
}
