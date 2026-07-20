"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import type { NormalizedDealFilters } from "@/app/dashboard/deals/queries";
import { ClearFiltersButton } from "@/components/filters/clear-filters-button";
import { SearchInput } from "@/components/filters/search-input";
import { useDebouncedUrlSearch } from "@/components/filters/use-debounced-url-search";
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

export function DealsFilters({ filters, ownerOptions, accountOptions, view }: DealsFiltersProps) {
  const draggingRef = useRef(false);
  const closeFromRef = useRef<HTMLInputElement>(null);
  const closeToRef = useRef<HTMLInputElement>(null);
  const controller = useDebouncedUrlSearch({
    initialSearch: filters.search,
    canCommit: () => !draggingRef.current,
  });

  useEffect(() => {
    const onDragState = (event: Event) => {
      draggingRef.current = (event as CustomEvent<boolean>).detail;
    };
    window.addEventListener("leadflow:deal-drag", onDragState);
    return () => window.removeEventListener("leadflow:deal-drag", onDragState);
  }, []);

  const apply = (updates: Record<string, string | null>) => controller.replace(updates);
  const hasFilters = Boolean(
    controller.search.trim() || filters.owner || filters.account || filters.stage ||
      filters.state || filters.closeFrom || filters.closeTo,
  );
  const activeCount = [
    controller.search.trim(), filters.owner, filters.account, filters.stage,
    filters.state, filters.closeFrom || filters.closeTo,
  ].filter(Boolean).length;

  const clear = () => {
    if (closeFromRef.current) closeFromRef.current.value = "";
    if (closeToRef.current) closeToRef.current.value = "";
    controller.clear(
      { search: null, owner: null, account: null, stage: null, state: null, closeFrom: null, closeTo: null },
    );
  };

  return (
    <div className="relative flex min-w-0 flex-col gap-2 rounded-2xl border bg-background p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center" data-testid="deals-filter-toolbar" aria-busy={controller.isPending}>
      <SearchInput
        value={controller.search}
        onChange={controller.setSearch}
        onCommit={controller.commitSearch}
        onClear={controller.clearSearch}
        isPending={controller.isPending}
        inputRef={controller.inputRef}
        placeholder="Search deals, accounts, or contacts"
        ariaLabel="Search deals"
        className="w-full min-w-0 sm:min-w-[13rem] sm:flex-1"
        testId="deals-search-input"
      />

      <label className="w-full sm:w-auto">
        <span className="sr-only">Owner</span>
        <select key={filters.owner} defaultValue={filters.owner} onChange={(event) => apply({ owner: event.target.value || null })} className={cn(controlClass, "w-full sm:w-[9.5rem]")} aria-label="Owner">
          <option value="">All owners</option>
          {ownerOptions.map((owner) => <option key={owner.userId} value={owner.userId}>{owner.name}</option>)}
        </select>
      </label>

      <label className="w-full sm:w-auto">
        <span className="sr-only">Account</span>
        <select key={filters.account} defaultValue={filters.account} onChange={(event) => apply({ account: event.target.value || null })} className={cn(controlClass, "w-full sm:w-[10.5rem]")} aria-label="Account">
          <option value="">All accounts</option>
          {accountOptions.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select>
      </label>

      <details className="group relative w-full sm:w-auto">
        <summary className="flex h-9 w-full cursor-pointer list-none items-center justify-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium shadow-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal className="h-4 w-4" />
          More filters
          {activeCount > 0 ? <span className="rounded-full bg-primary px-1.5 py-0.5 text-[0.6875rem] text-primary-foreground">{activeCount}</span> : null}
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="relative z-30 mt-2 grid w-full grid-cols-1 gap-3 rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg sm:absolute sm:right-0 sm:w-[min(34rem,calc(100vw-2rem))] sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            <span>Stage</span>
            <select key={filters.stage} defaultValue={filters.stage} onChange={(event) => apply({ stage: event.target.value || null })} className={cn(controlClass, "w-full text-foreground")}>
              <option value="">All stages</option>
              {DEAL_STAGES.map((stage) => <option key={stage} value={stage}>{DEAL_STAGE_LABELS[stage]}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            <span>Deal state</span>
            <select key={filters.state} defaultValue={filters.state} onChange={(event) => apply({ state: event.target.value || null })} className={cn(controlClass, "w-full text-foreground")}>
              <option value="">Open and closed</option><option value="open">Open only</option><option value="closed">Closed only</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground"><span>Close date from</span><input key={filters.closeFrom} ref={closeFromRef} defaultValue={filters.closeFrom} type="date" className={cn(controlClass, "w-full text-foreground")} /></label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground"><span>Close date to</span><input key={filters.closeTo} ref={closeToRef} defaultValue={filters.closeTo} type="date" className={cn(controlClass, "w-full text-foreground")} /></label>
          <Button type="button" size="sm" variant="outline" onClick={() => apply({ closeFrom: closeFromRef.current?.value || null, closeTo: closeToRef.current?.value || null })} className="sm:col-span-2">Apply date range</Button>
          {view === "list" ? (
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground sm:col-span-2">
              <span>Sort</span>
              <select key={filters.sort} defaultValue={filters.sort} onChange={(event) => apply({ sort: event.target.value })} className={cn(controlClass, "w-full text-foreground")}>
                <option value="closeAsc">Close date</option><option value="valueDesc">Highest value</option><option value="updatedDesc">Recently updated</option>
              </select>
            </label>
          ) : null}
        </div>
      </details>

      {hasFilters ? <ClearFiltersButton onClear={clear} disabled={controller.isPending} /> : null}
    </div>
  );
}
