"use client";

import { ClearFiltersButton } from "@/components/filters/clear-filters-button";
import { SearchInput } from "@/components/filters/search-input";
import { useDebouncedUrlSearch } from "@/components/filters/use-debounced-url-search";
import { ResponsiveFilterPanel } from "@/components/filters/responsive-filter-panel";

export function ImportHistoryFilters({ search, status, entityType }: { search: string; status: string; entityType: string }) {
  const controller = useDebouncedUrlSearch({ initialSearch: search });
  const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/40 sm:w-auto";
  const hasFilters = Boolean(controller.search.trim() || status || entityType);
  const activeCount = [controller.search.trim(), status, entityType].filter(Boolean).length;
  const update = (values: Record<string, string | null>) => controller.replace(values);
  const clear = () => controller.clear({ search: null, status: null, entityType: null });
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border bg-background p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center" aria-busy={controller.isPending} data-testid="import-history-filter-toolbar">
      <SearchInput value={controller.search} onChange={controller.setSearch} onCommit={controller.commitSearch} onClear={controller.clearSearch} isPending={controller.isPending} inputRef={controller.inputRef} placeholder="Search file or actor" ariaLabel="Search import history" className="w-full min-w-0 sm:min-w-[16rem] sm:flex-1" testId="import-history-search-input" />
      <ResponsiveFilterPanel activeCount={activeCount} className="min-w-0 flex-1 sm:justify-end">
      <label className="w-full sm:w-auto"><span className="sr-only">Import status</span><select key={status} defaultValue={status} onChange={(event) => update({ status: event.target.value || null })} className={selectClass} aria-label="Import status"><option value="">All statuses</option><option value="draft">Draft</option><option value="reviewed">Reviewed</option><option value="processing">Processing</option><option value="completed">Completed</option><option value="failed">Failed</option></select></label>
      <label className="w-full sm:w-auto"><span className="sr-only">Record type</span><select key={entityType} defaultValue={entityType} onChange={(event) => update({ entityType: event.target.value || null })} className={selectClass} aria-label="Record type"><option value="">All record types</option><option value="lead">Leads</option><option value="account">Accounts</option><option value="contact">Contacts</option></select></label>
      {hasFilters ? <ClearFiltersButton onClear={clear} disabled={controller.isPending} /> : null}
      </ResponsiveFilterPanel>
    </div>
  );
}
