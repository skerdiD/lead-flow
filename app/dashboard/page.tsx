import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  getDashboardStats,
  getLeadPipelineData,
  getRecentLeads,
  getSourcePerformanceData,
} from "@/app/dashboard/queries";
import { LeadPipelineChart } from "@/components/dashboard/charts/lead-pipeline-chart";
import { LeadSourcePerformanceChart } from "@/components/dashboard/charts/lead-source-performance-chart";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { RecentLeadsList } from "@/components/dashboard/recent-leads-list";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";

function toPercent(value: number) {
  return `${Math.round(value)}%`;
}

export default async function DashboardPage() {
  const [stats, recentLeads, leadPipelineData, sourcePerformanceData] =
    await Promise.all([
      getDashboardStats(),
      getRecentLeads(5),
      getLeadPipelineData(),
      getSourcePerformanceData(),
    ]);

  const isEmpty = stats.totalLeads === 0;
  const activePipeline =
    stats.contactedLeads + stats.interestedLeads + stats.proposalLeads;
  const winRate =
    stats.totalLeads > 0 ? (stats.closedLeads / stats.totalLeads) * 100 : 0;
  const lossRate =
    stats.totalLeads > 0 ? (stats.lostLeads / stats.totalLeads) * 100 : 0;

  return (
    <div className="space-y-7 lg:space-y-8">
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-muted/40 p-6 shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="inline-flex items-center rounded-full border bg-muted/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Overview
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              A clear view of your lead pipeline.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Track momentum, surface bottlenecks, and manage opportunities from one focused dashboard.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border bg-background px-2.5 py-1">
                {stats.totalLeads} total leads
              </span>
              <span className="rounded-full border bg-background px-2.5 py-1">
                {activePipeline} active in pipeline
              </span>
              <span className="rounded-full border bg-background px-2.5 py-1">
                {toPercent(winRate)} win rate
              </span>
              <span className="rounded-full border bg-background px-2.5 py-1">
                {stats.notesCount} notes logged
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button asChild>
              <Link href="/dashboard/leads/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Lead
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/leads">
                View leads
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Leads"
          value={stats.totalLeads}
          description="All opportunities currently tracked in your workspace."
          icon={Users}
          tone="neutral"
          helper={`${activePipeline} active`}
        />
        <StatCard
          title="New Leads"
          value={stats.newLeads}
          description="Fresh opportunities waiting for first-touch follow-up."
          icon={Sparkles}
          tone="info"
          badge={toPercent(stats.totalLeads > 0 ? (stats.newLeads / stats.totalLeads) * 100 : 0)}
          helper="of total pipeline"
        />
        <StatCard
          title="Pipeline In Motion"
          value={activePipeline}
          description="Contacted, interested, and proposal-stage leads combined."
          icon={BriefcaseBusiness}
          tone="warning"
          helper={`${stats.proposalLeads} in proposal stage`}
          badge={`${stats.notesCount} notes`}
        />
        <StatCard
          title="Closed Won"
          value={stats.closedLeads}
          description="Leads converted into completed outcomes."
          icon={BadgeCheck}
          tone="positive"
          badge={toPercent(winRate)}
          helper={`${toPercent(lossRate)} loss rate`}
        />
      </section>

      {!isEmpty ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <LeadPipelineChart data={leadPipelineData} />
          <LeadSourcePerformanceChart data={sourcePerformanceData} />
        </section>
      ) : null}

      {isEmpty ? <DashboardEmptyState /> : <RecentLeadsList leads={recentLeads} />}

      {!isEmpty ? (
        <section className="rounded-3xl border bg-background p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Pipeline momentum</p>
              <p className="text-sm text-muted-foreground">
                Your current close rate is {toPercent(winRate)} across {stats.totalLeads} tracked lead
                {stats.totalLeads === 1 ? "" : "s"}.
              </p>
            </div>
            <p className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              Updated in real time
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
