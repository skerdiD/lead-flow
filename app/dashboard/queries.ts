import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { crmTasks, deals, leadNotes, leads } from "@/db/schema";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/constants/leads";
import {
  calculateRevenueSummary,
  type RevenueSummary,
} from "@/lib/revenue";
import { getCurrentWorkspace } from "@/lib/workspaces";

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

export type RevenueDashboardData = RevenueSummary;

export async function getDashboardStats() {
  const workspace = await getCurrentWorkspace();

  const [[stats], [notesStats], [dealStats], [taskStats]] = await Promise.all([
    db
      .select({
        totalLeads: sql<number>`count(*)`,
        newLeads: sql<number>`count(*) filter (where ${leads.status} = 'New')`,
        contactedLeads: sql<number>`count(*) filter (where ${leads.status} = 'Contacted')`,
        interestedLeads: sql<number>`count(*) filter (where ${leads.status} = 'Interested')`,
        proposalLeads: sql<number>`count(*) filter (where ${leads.status} = 'Proposal Sent')`,
        closedLeads: sql<number>`count(*) filter (where ${leads.status} = 'Closed')`,
        lostLeads: sql<number>`count(*) filter (where ${leads.status} = 'Lost')`,
      })
      .from(leads)
      .where(and(eq(leads.workspaceId, workspace.id), eq(leads.isArchived, false))),
    db
      .select({
        notesCount: sql<number>`count(*)`,
      })
      .from(leadNotes)
      .where(eq(leadNotes.workspaceId, workspace.id)),
    db
      .select({
        totalDeals: sql<number>`count(*)`,
        openDeals: sql<number>`count(*) filter (where ${deals.stage} not in ('won', 'lost'))`,
        wonDeals: sql<number>`count(*) filter (where ${deals.stage} = 'won')`,
      })
      .from(deals)
      .where(eq(deals.workspaceId, workspace.id)),
    db
      .select({
        openTasks: sql<number>`count(*) filter (where ${crmTasks.status} <> 'done')`,
        overdueTasks: sql<number>`count(*) filter (where ${crmTasks.status} = 'overdue' or (${crmTasks.status} = 'pending' and ${crmTasks.dueAt} < now()))`,
      })
      .from(crmTasks)
      .where(eq(crmTasks.workspaceId, workspace.id)),
  ]);

  return {
    totalLeads: Number(stats?.totalLeads ?? 0),
    newLeads: Number(stats?.newLeads ?? 0),
    contactedLeads: Number(stats?.contactedLeads ?? 0),
    interestedLeads: Number(stats?.interestedLeads ?? 0),
    proposalLeads: Number(stats?.proposalLeads ?? 0),
    closedLeads: Number(stats?.closedLeads ?? 0),
    lostLeads: Number(stats?.lostLeads ?? 0),
    notesCount: Number(notesStats?.notesCount ?? 0),
    totalDeals: Number(dealStats?.totalDeals ?? 0),
    openDeals: Number(dealStats?.openDeals ?? 0),
    wonDeals: Number(dealStats?.wonDeals ?? 0),
    openTasks: Number(taskStats?.openTasks ?? 0),
    overdueTasks: Number(taskStats?.overdueTasks ?? 0),
  };
}

export async function getRecentLeads(limit = 5) {
  const workspace = await getCurrentWorkspace();

  return db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      company: leads.company,
      status: leads.status,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(and(eq(leads.workspaceId, workspace.id), eq(leads.isArchived, false)))
    .orderBy(desc(leads.createdAt))
    .limit(limit);
}

export async function getLeadPipelineData() {
  const workspace = await getCurrentWorkspace();

  const rows = await db
    .select({
      status: leads.status,
      total: sql<number>`count(*)`,
    })
    .from(leads)
    .where(and(eq(leads.workspaceId, workspace.id), eq(leads.isArchived, false)))
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

export async function getRevenueDashboardData(): Promise<RevenueDashboardData> {
  const workspace = await getCurrentWorkspace();

  const dealRows = await db
    .select({
      stage: deals.stage,
      valueCents: deals.valueCents,
      probability: deals.probability,
      expectedCloseAt: deals.expectedCloseAt,
      closedAt: deals.closedAt,
      currency: deals.currency,
    })
    .from(deals)
    .where(eq(deals.workspaceId, workspace.id));

  return calculateRevenueSummary(dealRows);
}

export async function getSourcePerformanceData(limit = 6) {
  const workspace = await getCurrentWorkspace();
  const sourceLabel = sql<string>`coalesce(nullif(trim(${leads.source}), ''), 'Unspecified')`;

  const rows = await db
    .select({
      source: sourceLabel,
      total: sql<number>`count(*)`,
      qualified: sql<number>`count(*) filter (where ${leads.status} in ('Interested', 'Proposal Sent', 'Closed'))`,
      won: sql<number>`count(*) filter (where ${leads.status} = 'Closed')`,
    })
    .from(leads)
    .where(and(eq(leads.workspaceId, workspace.id), eq(leads.isArchived, false)))
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
