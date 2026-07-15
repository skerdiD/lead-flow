import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CircleDollarSign,
  Plus,
  TrendingUp,
} from "lucide-react";
import {
  getDashboardStats,
  getLeadPipelineData,
  getRecentLeads,
  getRevenueDashboardData,
  getSourcePerformanceData,
} from "@/app/dashboard/queries";
import { getDashboardAttentionData } from "@/app/dashboard/tasks/queries";
import { DealRevenuePipelineChart } from "@/components/dashboard/charts/deal-revenue-pipeline-chart";
import { LeadRevenueHealthCard } from "@/components/dashboard/charts/lead-revenue-health-card";
import { LeadPipelineChart } from "@/components/dashboard/charts/lead-pipeline-chart";
import { LeadSourcePerformanceChart } from "@/components/dashboard/charts/lead-source-performance-chart";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { NeedsAttentionPanel } from "@/components/dashboard/needs-attention-panel";
import { RecentLeadsList } from "@/components/dashboard/recent-leads-list";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { isDemoWorkspace } from "@/lib/demo";
import { formatCurrencyFromCents } from "@/lib/revenue";
import { getCurrentWorkspace } from "@/lib/workspaces";

function toPercent(value: number) {
  return `${Math.round(value)}%`;
}

export default async function DashboardPage() {
  const [
    stats,
    recentLeads,
    leadPipelineData,
    sourcePerformanceData,
    revenueData,
    attentionData,
    workspace,
  ] =
    await Promise.all([
      getDashboardStats(),
      getRecentLeads(5),
      getLeadPipelineData(),
      getSourcePerformanceData(),
      getRevenueDashboardData(),
      getDashboardAttentionData(),
      getCurrentWorkspace(),
    ]);

  const isEmpty = stats.totalLeads === 0;
  const activePipeline =
    stats.contactedLeads + stats.interestedLeads + stats.proposalLeads;
  const winRate =
    stats.totalLeads > 0 ? (stats.closedLeads / stats.totalLeads) * 100 : 0;
  const revenueCurrency = revenueData.currency;
  const readOnly = isDemoWorkspace(workspace);

  return (
    <div className="space-y-7 lg:space-y-8">
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-muted/40 p-6 shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="inline-flex items-center rounded-full border bg-muted/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Overview
            </p>
            <h1 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              Your pipeline at a glance.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Track deals, follow up on leads, and keep work moving.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border bg-background px-2.5 py-1">
                {stats.totalLeads} total leads
              </span>
              <span className="rounded-full border bg-background px-2.5 py-1">
                {formatCurrencyFromCents(revenueData.totalPipelineValueCents, revenueCurrency)} pipeline
              </span>
              <span className="rounded-full border bg-background px-2.5 py-1">
                {toPercent(winRate)} win rate
              </span>
              <span className="rounded-full border bg-background px-2.5 py-1">
                {stats.openTasks} open follow-ups
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!readOnly ? (
              <Button asChild>
                <Link href="/dashboard/leads/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lead
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/dashboard/leads">
                {readOnly ? "Explore leads" : "View leads"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Pipeline"
          value={formatCurrencyFromCents(revenueData.totalPipelineValueCents, revenueCurrency)}
          description="Open deal value excluding won and lost opportunities."
          icon={CircleDollarSign}
          tone="neutral"
          helper={`${stats.openDeals} open deals`}
        />
        <StatCard
          title="Weighted Forecast"
          value={formatCurrencyFromCents(revenueData.weightedPipelineValueCents, revenueCurrency)}
          description="Open pipeline value multiplied by deal probability."
          icon={TrendingUp}
          tone="info"
          badge={`${stats.totalDeals} deals`}
          helper="probability adjusted"
        />
        <StatCard
          title="Expected This Month"
          value={formatCurrencyFromCents(revenueData.expectedRevenueThisMonthCents, revenueCurrency)}
          description="Weighted forecast for deals expected to close this month."
          icon={BriefcaseBusiness}
          tone="warning"
          helper={`${activePipeline} active leads`}
          badge={`${stats.overdueTasks} overdue`}
        />
        <StatCard
          title="Won Revenue"
          value={formatCurrencyFromCents(revenueData.wonRevenueCents, revenueCurrency)}
          description="Value of opportunities marked won."
          icon={BadgeCheck}
          tone="positive"
          badge={toPercent(winRate)}
          helper={`${formatCurrencyFromCents(revenueData.lostRevenueCents, revenueCurrency)} lost`}
        />
      </section>

      <NeedsAttentionPanel data={attentionData} />

      {!isEmpty ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <DealRevenuePipelineChart
            data={revenueData.pipelineByStage}
            currency={revenueCurrency}
          />
          <LeadPipelineChart data={leadPipelineData} />
        </section>
      ) : null}

      {!isEmpty ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <LeadSourcePerformanceChart data={sourcePerformanceData} />
          <LeadRevenueHealthCard stats={stats} revenueData={revenueData} />
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
