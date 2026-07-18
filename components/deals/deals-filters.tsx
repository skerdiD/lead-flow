import Link from "next/link";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import type { NormalizedDealFilters } from "@/app/dashboard/deals/queries";
import { Button } from "@/components/ui/button";
import { DEAL_STAGE_LABELS, DEAL_STAGES } from "@/lib/constants/crm";
import { cn } from "@/lib/utils";

type DealsFiltersProps = {
  filters: NormalizedDealFilters;
  ownerOptions: Array<{ userId: string; name: string }>;
  accountOptions: Array<{ id: string; name: string }>;
  view: "pipeline" | "list";
};

const controlClass =
  "h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/40";

export function DealsFilters({
  filters,
  ownerOptions,
  accountOptions,
  view,
}: DealsFiltersProps) {
  const advancedFilterCount = [
    filters.stage,
    filters.state,
    filters.closeFrom,
    filters.closeTo,
    view === "list" ? filters.sort : undefined,
  ].filter(Boolean).length;
  const hasFilters = Boolean(
    filters.search ||
      filters.owner ||
      filters.account ||
      advancedFilterCount,
  );
  const clearHref = view === "list" ? "/dashboard/deals?view=list" : "/dashboard/deals";

  return (
    <form
      action="/dashboard/deals"
      method="get"
      className="relative flex min-w-0 flex-wrap items-center gap-2 rounded-2xl border bg-background p-3 shadow-sm"
      data-testid="deals-filter-toolbar"
    >
      {view === "list" ? <input type="hidden" name="view" value="list" /> : null}
      <label className="relative min-w-[13rem] flex-1">
        <span className="sr-only">Search deals</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="search"
          defaultValue={filters.search ?? ""}
          className={cn(controlClass, "w-full pl-9")}
          placeholder="Search deals, accounts, or contacts"
        />
      </label>

      <label>
        <span className="sr-only">Owner</span>
        <select
          name="owner"
          defaultValue={filters.owner ?? ""}
          className={cn(controlClass, "w-[9.5rem]")}
        >
          <option value="">All owners</option>
          {ownerOptions.map((owner) => (
            <option key={owner.userId} value={owner.userId}>
              {owner.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="sr-only">Account</span>
        <select
          name="account"
          defaultValue={filters.account ?? ""}
          className={cn(controlClass, "w-[10.5rem]")}
        >
          <option value="">All accounts</option>
          {accountOptions.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>

      <details className="group relative">
        <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal className="h-4 w-4" />
          More filters
          {advancedFilterCount > 0 ? (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[0.6875rem] text-primary-foreground">
              {advancedFilterCount}
            </span>
          ) : null}
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="absolute right-0 z-30 mt-2 grid w-[min(34rem,calc(100vw-2rem))] grid-cols-1 gap-3 rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            <span>Stage</span>
            <select name="stage" defaultValue={filters.stage ?? ""} className={cn(controlClass, "w-full text-foreground")}>
              <option value="">All stages</option>
              {DEAL_STAGES.map((stage) => <option key={stage} value={stage}>{DEAL_STAGE_LABELS[stage]}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            <span>Deal state</span>
            <select name="state" defaultValue={filters.state ?? ""} className={cn(controlClass, "w-full text-foreground")}>
              <option value="">Open and closed</option>
              <option value="open">Open only</option>
              <option value="closed">Closed only</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            <span>Close date from</span>
            <input name="closeFrom" type="date" defaultValue={filters.closeFrom ?? ""} className={cn(controlClass, "w-full text-foreground")} />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            <span>Close date to</span>
            <input name="closeTo" type="date" defaultValue={filters.closeTo ?? ""} className={cn(controlClass, "w-full text-foreground")} />
          </label>
          {view === "list" ? (
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground sm:col-span-2">
              <span>Sort</span>
              <select name="sort" defaultValue={filters.sort ?? "closeAsc"} className={cn(controlClass, "w-full text-foreground")}>
                <option value="closeAsc">Close date</option>
                <option value="valueDesc">Highest value</option>
                <option value="updatedDesc">Recently updated</option>
              </select>
            </label>
          ) : null}
        </div>
      </details>

      <Button type="submit" size="sm">Apply</Button>
      {hasFilters ? (
        <Button asChild type="button" size="sm" variant="ghost">
          <Link href={clearHref}>
            <X className="mr-1.5 h-4 w-4" />
            Clear
          </Link>
        </Button>
      ) : null}
    </form>
  );
}
