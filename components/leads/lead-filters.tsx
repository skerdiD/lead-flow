"use client";

import { ClearFiltersButton } from "@/components/filters/clear-filters-button";
import { SearchInput } from "@/components/filters/search-input";
import { useDebouncedUrlSearch } from "@/components/filters/use-debounced-url-search";
import { LEAD_STATUSES } from "@/lib/constants/leads";
import { cn } from "@/lib/utils";

type SourceOption = { label: string; count: number };

type LeadFiltersProps = {
  initialSearch?: string;
  initialStatus?: string;
  initialSource?: string;
  initialOwner?: string;
  initialArchived?: "active" | "archived";
  sourceOptions?: SourceOption[];
  ownerOptions?: Array<{ userId: string; name: string }>;
};

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 font-sans text-sm shadow-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/40";

export function LeadFilters({
  initialSearch = "",
  initialStatus = "",
  initialSource = "",
  initialOwner = "",
  initialArchived = "active",
  sourceOptions = [],
  ownerOptions = [],
}: LeadFiltersProps) {
  const controller = useDebouncedUrlSearch({ initialSearch });
  const hasFilters = Boolean(
    controller.search.trim() || initialStatus || initialSource || initialOwner || initialArchived === "archived",
  );
  const apply = (updates: Record<string, string | null>) => controller.replace(updates);
  const clear = () => {
    controller.clear(
      { search: null, status: null, source: null, owner: null, archived: null },
    );
  };

  return (
    <div
      className="flex min-w-0 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center"
      aria-busy={controller.isPending}
      data-testid="leads-filter-toolbar"
    >
      <SearchInput
        value={controller.search}
        onChange={controller.setSearch}
        onCommit={controller.commitSearch}
        onClear={controller.clearSearch}
        isPending={controller.isPending}
        inputRef={controller.inputRef}
        placeholder="Search by name, company, email, or source..."
        ariaLabel="Search leads"
        className="w-full lg:min-w-[18rem] lg:flex-[1_1_18rem]"
        testId="leads-search-input"
      />

      <label className="w-full sm:w-auto">
        <span className="sr-only">Stage</span>
        <select key={initialStatus} defaultValue={initialStatus} onChange={(event) => apply({ status: event.target.value || null })} className={cn(selectClass, "sm:w-[10rem]")} aria-label="Stage">
          <option value="">All stages</option>
          {LEAD_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </label>

      <label className="w-full sm:w-auto">
        <span className="sr-only">Source</span>
        <select key={initialSource} defaultValue={initialSource} onChange={(event) => apply({ source: event.target.value || null })} className={cn(selectClass, "sm:w-[11rem]")} aria-label="Source">
          <option value="">All sources</option>
          {sourceOptions.map((source) => <option key={source.label} value={source.label}>{source.label} ({source.count})</option>)}
        </select>
      </label>

      <label className="w-full sm:w-auto">
        <span className="sr-only">Lead view</span>
        <select key={initialArchived} defaultValue={initialArchived} onChange={(event) => apply({ archived: event.target.value === "archived" ? "archived" : null })} className={cn(selectClass, "sm:w-[10rem]")} aria-label="Lead view">
          <option value="active">Active leads</option>
          <option value="archived">Archived leads</option>
        </select>
      </label>

      <label className="w-full sm:w-auto">
        <span className="sr-only">Owner</span>
        <select key={initialOwner} defaultValue={initialOwner} onChange={(event) => apply({ owner: event.target.value || null })} className={cn(selectClass, "sm:w-[10rem]")} aria-label="Owner">
          <option value="">All owners</option>
          {ownerOptions.map((owner) => <option key={owner.userId} value={owner.userId}>{owner.name}</option>)}
        </select>
      </label>

      {hasFilters ? <ClearFiltersButton onClear={clear} disabled={controller.isPending} /> : null}
    </div>
  );
}
