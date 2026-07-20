"use client";

import { ClearFiltersButton } from "@/components/filters/clear-filters-button";
import { SearchInput } from "@/components/filters/search-input";
import { useDebouncedUrlSearch } from "@/components/filters/use-debounced-url-search";

export function AuditLogFilters({ search }: { search: string }) {
  const controller = useDebouncedUrlSearch({ initialSearch: search });
  const clear = () => controller.clear({ search: null });
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-2xl border bg-muted/20 p-3" aria-busy={controller.isPending} data-testid="audit-log-filter-toolbar">
      <SearchInput value={controller.search} onChange={controller.setSearch} onCommit={controller.commitSearch} onClear={controller.clearSearch} isPending={controller.isPending} inputRef={controller.inputRef} placeholder="Search action, entity, actor, or ID" ariaLabel="Search audit log" className="min-w-0 flex-1" testId="audit-log-search-input" />
      {controller.search ? <ClearFiltersButton onClear={clear} disabled={controller.isPending} /> : null}
    </div>
  );
}
