import Link from "next/link";
import { AlertCircle, ArrowRight, BadgeAlert, CalendarClock, FileClock, PauseCircle } from "lucide-react";
import type { DashboardAttentionData } from "@/app/dashboard/tasks/queries";
import { TaskSections } from "@/components/tasks/task-sections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTaskDueDate } from "@/lib/tasks";

type NeedsAttentionPanelProps = {
  data: DashboardAttentionData;
};

function AttentionList({
  title,
  description,
  count,
  items,
  icon: Icon,
  emptyMessage,
}: {
  title: string;
  description: string;
  count: number;
  items: Array<{
    id: string;
    href: string;
    title: string;
    subtitle: string;
    meta?: string;
  }>;
  icon: typeof AlertCircle;
  emptyMessage: string;
}) {
  return (
    <section className="rounded-2xl border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold tracking-tight text-foreground">{title}</p>
            <Badge variant="outline">{count}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border bg-muted/30">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed bg-muted/15 px-4 py-5 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-start justify-between gap-3 rounded-2xl border bg-background px-3 py-3 transition-colors hover:bg-muted/20"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{item.title}</p>
                <p className="truncate text-sm text-muted-foreground">{item.subtitle}</p>
              </div>
              {item.meta ? (
                <span className="shrink-0 text-xs text-muted-foreground">{item.meta}</span>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function NeedsAttentionPanel({ data }: NeedsAttentionPanelProps) {
  const taskSections = [
    {
      key: "dueToday" as const,
      title: "Tasks due today",
      description: "Tasks due by the end of today.",
      emptyMessage: "No tasks due today",
      tasks: data.groupedTasks.dueToday,
    },
    {
      key: "overdue" as const,
      title: "Overdue tasks",
      description: "Past-due tasks that need attention.",
      emptyMessage: "No overdue tasks",
      tasks: data.groupedTasks.overdue,
    },
  ];

  const isCaughtUp =
    data.counts.dueToday === 0 &&
    data.counts.overdue === 0 &&
    data.counts.followUpsDueToday === 0 &&
    data.counts.staleLeads === 0 &&
    data.counts.proposalsWaitingResponse === 0;

  return (
    <section className="rounded-3xl border bg-background p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-lg font-semibold tracking-tight text-foreground">
            Needs your attention
          </p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Tasks and leads that need a follow-up today.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/dashboard/tasks">
            View all tasks
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
        <TaskSections
          sections={taskSections}
          compact
          globalEmptyTitle="You are caught up"
          globalEmptyDescription="No urgent or overdue tasks are waiting on you right now."
        />

        <div className="space-y-4">
          <AttentionList
            title="Follow-ups due today"
            description="Leads to contact today."
            count={data.counts.followUpsDueToday}
            icon={CalendarClock}
            emptyMessage="No follow-ups due today"
            items={data.followUpsDueToday.map((lead) => ({
              id: lead.id,
              href: `/dashboard/leads/${lead.id}`,
              title: lead.fullName,
              subtitle: lead.company || lead.note || "Open the lead to add a follow-up.",
              meta: lead.dueAt ? formatTaskDueDate(lead.dueAt) : undefined,
            }))}
          />

          <AttentionList
            title="Leads with no recent activity"
            description="Open leads with no recent activity."
            count={data.counts.staleLeads}
            icon={PauseCircle}
            emptyMessage="No inactive leads need attention"
            items={data.staleLeads.map((lead) => ({
              id: lead.id,
              href: `/dashboard/leads/${lead.id}`,
              title: lead.fullName,
              subtitle: lead.company || lead.status,
              meta: lead.status,
            }))}
          />

          <AttentionList
            title="Proposals waiting response"
            description="Deals in proposal stage that may need a check-in."
            count={data.counts.proposalsWaitingResponse}
            icon={FileClock}
            emptyMessage="No proposals are waiting for a response"
            items={data.proposalsWaitingResponse.map((proposal) => ({
              id: proposal.id,
              href: `/dashboard/leads/${proposal.leadId}`,
              title: proposal.leadName,
              subtitle: proposal.dealName,
              meta: proposal.expectedCloseAt
                ? `Close ${formatTaskDueDate(proposal.expectedCloseAt)}`
                : "Proposal stage",
            }))}
          />
        </div>
      </div>

      {isCaughtUp ? (
        <div className="mt-4 rounded-2xl border border-dashed bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <BadgeAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>You are caught up. Review upcoming tasks or add follow-ups to active leads.</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
