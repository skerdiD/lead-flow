import { Activity, CircleDollarSign, Target, Users, type LucideIcon } from "lucide-react";
import type { RevenueSummary } from "@/lib/revenue";
import { formatCurrencyFromCents } from "@/lib/revenue";

type LeadRevenueHealthStats = {
  totalLeads: number;
  contactedLeads: number;
  interestedLeads: number;
  proposalLeads: number;
  closedLeads: number;
  lostLeads: number;
  totalDeals: number;
  openDeals: number;
};

type LeadRevenueHealthCardProps = {
  stats: LeadRevenueHealthStats;
  revenueData: RevenueSummary;
};

type HealthMetric = {
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "info" | "positive" | "warning";
  icon: LucideIcon;
};

type HealthBar = {
  label: string;
  value: string;
  percent: number;
  detail: string;
  className: string;
};

function toPercent(value: number) {
  return `${Math.round(value)}%`;
}

function safePercent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

function toneClass(tone: HealthMetric["tone"]) {
  switch (tone) {
    case "positive":
      return "border-emerald-200/80 bg-emerald-50 text-emerald-700";
    case "info":
      return "border-sky-200/80 bg-sky-50 text-sky-700";
    case "warning":
      return "border-amber-200/80 bg-amber-50 text-amber-700";
    default:
      return "border-border/70 bg-muted/30 text-muted-foreground";
  }
}

function HealthMetricCard({ metric }: { metric: HealthMetric }) {
  const Icon = metric.icon;

  return (
    <div className="rounded-2xl border bg-background/80 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {metric.label}
        </p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl border ${toneClass(metric.tone)}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
        {metric.value}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {metric.detail}
      </p>
    </div>
  );
}

function HealthProgressBar({ item }: { item: HealthBar }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs">
        <div>
          <p className="font-semibold text-foreground">{item.label}</p>
          <p className="text-muted-foreground">{item.detail}</p>
        </div>
        <span className="shrink-0 font-semibold text-foreground">{item.value}</span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={`${item.label}: ${item.value}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={item.percent}
      >
        <div
          className={`h-full rounded-full ${item.className}`}
          style={{ width: `${item.percent}%` }}
        />
      </div>
    </div>
  );
}

export function LeadRevenueHealthCard({
  stats,
  revenueData,
}: LeadRevenueHealthCardProps) {
  const activeLeads =
    stats.contactedLeads + stats.interestedLeads + stats.proposalLeads;
  const qualifiedLeads =
    stats.interestedLeads + stats.proposalLeads + stats.closedLeads;
  const winRate = safePercent(stats.closedLeads, stats.totalLeads);
  const lossRate = safePercent(stats.lostLeads, stats.totalLeads);
  const dealCoverage = safePercent(stats.totalDeals, stats.totalLeads);
  const averageWeightedDealCents =
    stats.openDeals > 0
      ? Math.round(revenueData.weightedPipelineValueCents / stats.openDeals)
      : 0;
  const revenueCurrency = revenueData.currency;
  const revenueTotal = Math.max(
    1,
    revenueData.weightedPipelineValueCents +
      revenueData.expectedRevenueThisMonthCents +
      revenueData.wonRevenueCents +
      revenueData.lostRevenueCents,
  );

  const metrics: HealthMetric[] = [
    {
      label: "Win rate",
      value: toPercent(winRate),
      detail: `${stats.closedLeads} closed from ${stats.totalLeads} leads`,
      tone: "positive",
      icon: Target,
    },
    {
      label: "Deal coverage",
      value: toPercent(dealCoverage),
      detail: `${stats.totalDeals} linked deals`,
      tone: "info",
      icon: Activity,
    },
    {
      label: "Avg forecast",
      value: formatCurrencyFromCents(averageWeightedDealCents, revenueCurrency),
      detail: `${stats.openDeals} open deals`,
      tone: "neutral",
      icon: CircleDollarSign,
    },
  ];

  const leadBars: HealthBar[] = [
    {
      label: "Active pipeline",
      value: `${activeLeads} leads`,
      percent: safePercent(activeLeads, stats.totalLeads),
      detail: "Contacted through proposal",
      className: "bg-[var(--color-chart-1)]",
    },
    {
      label: "Qualified motion",
      value: `${qualifiedLeads} leads`,
      percent: safePercent(qualifiedLeads, stats.totalLeads),
      detail: "Interested, proposal, and closed",
      className: "bg-[var(--color-chart-3)]",
    },
    {
      label: "Closed wins",
      value: `${stats.closedLeads} won`,
      percent: winRate,
      detail: "Closed leads as share of total",
      className: "bg-[var(--color-chart-5)]",
    },
  ];

  const revenueBars: HealthBar[] = [
    {
      label: "Open forecast",
      value: formatCurrencyFromCents(
        revenueData.weightedPipelineValueCents,
        revenueCurrency,
      ),
      percent: safePercent(revenueData.weightedPipelineValueCents, revenueTotal),
      detail: "Probability-adjusted pipeline",
      className: "bg-[var(--primary)]",
    },
    {
      label: "Expected this month",
      value: formatCurrencyFromCents(
        revenueData.expectedRevenueThisMonthCents,
        revenueCurrency,
      ),
      percent: safePercent(revenueData.expectedRevenueThisMonthCents, revenueTotal),
      detail: "Weighted closes due this month",
      className: "bg-[var(--color-chart-4)]",
    },
    {
      label: "Won revenue",
      value: formatCurrencyFromCents(revenueData.wonRevenueCents, revenueCurrency),
      percent: safePercent(revenueData.wonRevenueCents, revenueTotal),
      detail: "Closed-won deal value",
      className: "bg-emerald-500",
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-muted/30 p-5 shadow-sm">
      <div className="pointer-events-none absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Lead and revenue health
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {stats.totalLeads} leads, {stats.totalDeals} deals, and{" "}
            {formatCurrencyFromCents(
              revenueData.weightedPipelineValueCents,
              revenueCurrency,
            )}{" "}
            in weighted open forecast.
          </p>
        </div>
        <p className="inline-flex w-fit items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {toPercent(lossRate)} loss rate
        </p>
      </div>

      <div className="relative mt-4 grid gap-3 sm:grid-cols-3">
        {metrics.map((metric) => (
          <HealthMetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="relative mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border bg-background/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Lead conversion
          </p>
          <div className="mt-4 space-y-4">
            {leadBars.map((item) => (
              <HealthProgressBar key={item.label} item={item} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-background/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Revenue quality
          </p>
          <div className="mt-4 space-y-4">
            {revenueBars.map((item) => (
              <HealthProgressBar key={item.label} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
