import { and, asc, desc, eq, isNull, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityEvents, crmTasks, deals, leads } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import {
  getLocalDateKey,
  groupTasksByTimeline,
  type GroupedTasks,
  type TaskListItem,
} from "@/lib/tasks";
import { getCurrentWorkspace } from "@/lib/workspaces";

export type AttentionLeadItem = {
  id: string;
  fullName: string;
  company: string | null;
  status: string;
  dueAt: Date | null;
  note: string | null;
};

export type ProposalWaitingItem = {
  id: string;
  leadId: string;
  leadName: string;
  company: string | null;
  dealName: string;
  expectedCloseAt: Date | null;
  updatedAt: Date;
};

export type DashboardAttentionData = {
  groupedTasks: Pick<GroupedTasks, "dueToday" | "overdue">;
  counts: {
    dueToday: number;
    overdue: number;
    followUpsDueToday: number;
    staleLeads: number;
    proposalsWaitingResponse: number;
  };
  followUpsDueToday: AttentionLeadItem[];
  staleLeads: AttentionLeadItem[];
  proposalsWaitingResponse: ProposalWaitingItem[];
};

export type TasksPageData = {
  groupedTasks: GroupedTasks;
  counts: {
    dueToday: number;
    overdue: number;
    upcoming: number;
    completed: number;
  };
};

function buildTaskOwnerScope(userId: string) {
  return or(
    eq(crmTasks.ownerUserId, userId),
    and(isNull(crmTasks.ownerUserId), eq(crmTasks.userId, userId)),
  );
}

function mapTaskRow(row: {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date | null;
  status: "pending" | "completed";
  priority: "low" | "medium" | "high";
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  leadId: string | null;
  leadName: string | null;
  leadCompany: string | null;
}): TaskListItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueAt: row.dueAt,
    status: row.status,
    priority: row.priority,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    leadId: row.leadId,
    leadName: row.leadName,
    leadCompany: row.leadCompany,
  };
}

async function getScopedTasks() {
  const [userId, workspace] = await Promise.all([
    requireUserId(),
    getCurrentWorkspace(),
  ]);

  return db
    .select({
      id: crmTasks.id,
      title: crmTasks.title,
      description: crmTasks.description,
      dueAt: crmTasks.dueAt,
      status: crmTasks.status,
      priority: crmTasks.priority,
      completedAt: crmTasks.completedAt,
      createdAt: crmTasks.createdAt,
      updatedAt: crmTasks.updatedAt,
      leadId: crmTasks.leadId,
      leadName: leads.fullName,
      leadCompany: leads.company,
    })
    .from(crmTasks)
    .leftJoin(
      leads,
      and(eq(crmTasks.leadId, leads.id), eq(leads.workspaceId, workspace.id)),
    )
    .where(and(eq(crmTasks.workspaceId, workspace.id), buildTaskOwnerScope(userId)))
    .orderBy(asc(crmTasks.dueAt), desc(crmTasks.createdAt));
}

export async function getTasksPageData(): Promise<TasksPageData> {
  const tasks = (await getScopedTasks()).map(mapTaskRow);
  const groupedTasks = groupTasksByTimeline(tasks);

  return {
    groupedTasks,
    counts: {
      dueToday: groupedTasks.dueToday.length,
      overdue: groupedTasks.overdue.length,
      upcoming: groupedTasks.upcoming.length,
      completed: groupedTasks.completed.length,
    },
  };
}

export async function getDashboardAttentionData(
  previewLimit = 3,
): Promise<DashboardAttentionData> {
  const [tasks, followUpRows, staleLeadRows, proposalRows] =
    await Promise.all([
      getScopedTasks(),
      (async () => {
        const currentWorkspace = await getCurrentWorkspace();
        const todayKey = getLocalDateKey();

        return db
          .select({
            id: leads.id,
            fullName: leads.fullName,
            company: leads.company,
            status: leads.status,
            dueAt: leads.nextFollowUpDate,
            note: leads.followUpNote,
          })
          .from(leads)
          .where(
            and(
              eq(leads.workspaceId, currentWorkspace.id),
              eq(leads.isArchived, false),
              notInArray(leads.followUpStatus, ["completed"]),
              sql`to_char(${leads.nextFollowUpDate} at time zone 'UTC', 'YYYY-MM-DD') = ${todayKey}`,
            ),
          )
          .orderBy(asc(leads.nextFollowUpDate), asc(leads.fullName));
      })(),
      (async () => {
        const currentWorkspace = await getCurrentWorkspace();
        const staleCutoff = new Date();
        staleCutoff.setDate(staleCutoff.getDate() - 14);

        const latestActivityByLead = db
          .select({
            leadId: activityEvents.leadId,
            lastActivityAt: sql<Date>`max(${activityEvents.createdAt})`,
          })
          .from(activityEvents)
          .where(
            and(
              eq(activityEvents.workspaceId, currentWorkspace.id),
              sql`${activityEvents.leadId} is not null`,
            ),
          )
          .groupBy(activityEvents.leadId)
          .as("latest_activity_by_lead");

        return db
          .select({
            id: leads.id,
            fullName: leads.fullName,
            company: leads.company,
            status: leads.status,
            dueAt: latestActivityByLead.lastActivityAt,
            note: leads.followUpNote,
          })
          .from(leads)
          .leftJoin(latestActivityByLead, eq(leads.id, latestActivityByLead.leadId))
          .where(
            and(
              eq(leads.workspaceId, currentWorkspace.id),
              eq(leads.isArchived, false),
              notInArray(leads.status, ["Closed", "Lost"]),
              or(
                isNull(latestActivityByLead.lastActivityAt),
                sql`${latestActivityByLead.lastActivityAt} < ${staleCutoff}`,
              ),
            ),
          )
          .orderBy(
            asc(sql`coalesce(${latestActivityByLead.lastActivityAt}, ${leads.createdAt})`),
            asc(leads.fullName),
          );
      })(),
      (async () => {
        const currentWorkspace = await getCurrentWorkspace();

        return db
          .select({
            id: deals.id,
            leadId: leads.id,
            leadName: leads.fullName,
            company: leads.company,
            dealName: deals.name,
            expectedCloseAt: deals.expectedCloseAt,
            updatedAt: deals.updatedAt,
          })
          .from(deals)
          .innerJoin(
            leads,
            and(eq(deals.leadId, leads.id), eq(leads.workspaceId, currentWorkspace.id)),
          )
          .where(
            and(
              eq(deals.workspaceId, currentWorkspace.id),
              eq(leads.isArchived, false),
              eq(deals.stage, "proposal"),
            ),
          )
          .orderBy(
            asc(sql`coalesce(${deals.expectedCloseAt}, ${deals.updatedAt})`),
            asc(leads.fullName),
          );
      })(),
    ]);

  const groupedTasks = groupTasksByTimeline(tasks.map(mapTaskRow));

  return {
    groupedTasks: {
      dueToday: groupedTasks.dueToday.slice(0, previewLimit),
      overdue: groupedTasks.overdue.slice(0, previewLimit),
    },
    counts: {
      dueToday: groupedTasks.dueToday.length,
      overdue: groupedTasks.overdue.length,
      followUpsDueToday: followUpRows.length,
      staleLeads: staleLeadRows.length,
      proposalsWaitingResponse: proposalRows.length,
    },
    followUpsDueToday: followUpRows.slice(0, previewLimit),
    staleLeads: staleLeadRows.slice(0, previewLimit),
    proposalsWaitingResponse: proposalRows
      .filter((row) => row.leadId)
      .slice(0, previewLimit)
      .map((row) => ({
        id: row.id,
        leadId: row.leadId,
        leadName: row.leadName,
        company: row.company,
        dealName: row.dealName,
        expectedCloseAt: row.expectedCloseAt,
        updatedAt: row.updatedAt,
      })),
  };
}
