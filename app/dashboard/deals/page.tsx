import Link from "next/link";
import { LayoutGrid, List, Plus } from "lucide-react";
import { getDealsPipeline } from "@/app/dashboard/deals/queries";
import { DealsFilters } from "@/components/deals/deals-filters";
import { DealsList } from "@/components/deals/deals-list";
import { DealsPipeline } from "@/components/deals/deals-pipeline";
import { Button } from "@/components/ui/button";
import { hasWorkspacePermission } from "@/lib/authorization";
import { isDemoWorkspace } from "@/lib/demo";
import { getCurrentWorkspace } from "@/lib/workspaces";
import { cn } from "@/lib/utils";

type DealsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

function viewHref(
  params: Record<string, string | undefined>,
  view: "pipeline" | "list",
) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page" && key !== "view") next.set(key, value);
  }
  if (view === "list") next.set("view", "list");
  const query = next.toString();
  return query ? `/dashboard/deals?${query}` : "/dashboard/deals";
}

export default async function DealsPage({ searchParams }: DealsPageProps) {
  const params = await searchParams;
  const [data, workspace] = await Promise.all([
    getDealsPipeline(params),
    getCurrentWorkspace(),
  ]);
  const demo = isDemoWorkspace(workspace);
  const canUpdate =
    hasWorkspacePermission(workspace.role, "crm:update_all") ||
    hasWorkspacePermission(workspace.role, "crm:update_assigned");
  const canCreate = hasWorkspacePermission(workspace.role, "crm:create") && !demo;
  const readOnly = !canUpdate || demo;
  const view = data.filters.view;

  return (
    <div
      className="flex min-h-[calc(100dvh-8.25rem)] min-w-0 flex-col gap-4 overflow-x-clip"
      data-testid="deals-page"
    >
      <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Revenue pipeline
          </p>
          <h1 className="mt-1 font-display text-2xl font-medium tracking-tight sm:text-3xl">
            Deals
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and track your sales opportunities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border bg-background p-1 shadow-sm" aria-label="Deals view">
            <Link
              href={viewHref(params, "pipeline")}
              aria-current={view === "pipeline" ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                view === "pipeline" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              data-testid="pipeline-view-toggle"
            >
              <LayoutGrid className="h-4 w-4" />
              Pipeline
            </Link>
            <Link
              href={viewHref(params, "list")}
              aria-current={view === "list" ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              data-testid="list-view-toggle"
            >
              <List className="h-4 w-4" />
              List
            </Link>
          </div>
          {canCreate ? (
            <Button asChild size="sm">
              <Link href="/dashboard/deals/new">
                <Plus className="mr-1.5 h-4 w-4" />
                Create deal
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      <DealsFilters
        filters={data.filters}
        ownerOptions={data.ownerOptions}
        accountOptions={data.accountOptions}
        view={view}
      />

      <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label={view === "pipeline" ? "Deals pipeline" : "Deals list"}>
        {view === "pipeline" ? (
          <DealsPipeline
            initialBoard={data.grouped}
            initialTotals={data.totals}
            readOnly={readOnly}
            isTruncated={data.isTruncated}
          />
        ) : data.totalCount > 0 ? (
          <DealsList
            initialDeals={data.deals}
            totalCount={data.totalCount}
            page={data.page}
            pageCount={data.pageCount}
            pageSize={data.pageSize}
            readOnly={readOnly}
          />
        ) : (
          <div className="rounded-2xl border border-dashed bg-background px-6 py-12 text-center shadow-sm">
            <h2 className="font-semibold">No matching deals</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Clear or broaden the current filters to review more opportunities.
            </p>
            <Button asChild className="mt-5">
              <Link href="/dashboard/deals?view=list">Clear filters</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
