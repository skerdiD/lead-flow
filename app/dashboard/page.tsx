import Link from "next/link";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { getDashboardStats, getRecentLeads } from "@/app/dashboard/queries";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { RecentLeadsList } from "@/components/dashboard/recent-leads-list";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const [stats, recentLeads] = await Promise.all([
    getDashboardStats(),
    getRecentLeads(5),
  ]);

  const isEmpty = stats.totalLeads === 0;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-background p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">Overview</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              A clear view of your lead pipeline.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Track activity, monitor momentum, and keep your sales workflow
              organized from one focused dashboard.
            </p>
          </div>

          <Button asChild>
            <Link href="/dashboard/leads/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Lead
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Leads"
          value={stats.totalLeads}
          description="All leads currently stored in your workspace."
          icon={Users}
        />
        <StatCard
          title="New Leads"
          value={stats.newLeads}
          description="Fresh opportunities that still need early follow-up."
          icon={Sparkles}
        />
        <StatCard
          title="Interested Leads"
          value={stats.interestedLeads}
          description="Contacts showing intent and moving deeper in the pipeline."
          icon={BriefcaseBusiness}
        />
        <StatCard
          title="Closed Leads"
          value={stats.closedLeads}
          description="Leads successfully converted into completed outcomes."
          icon={BadgeCheck}
        />
      </section>

      {isEmpty ? (
        <DashboardEmptyState />
      ) : (
        <RecentLeadsList leads={recentLeads} />
      )}
    </div>
  );
}