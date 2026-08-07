"use client";

import { ClearFiltersButton } from "@/components/filters/clear-filters-button";
import { SearchInput } from "@/components/filters/search-input";
import { useDebouncedUrlSearch } from "@/components/filters/use-debounced-url-search";
import { ResponsiveFilterPanel } from "@/components/filters/responsive-filter-panel";

export function TaskFilters({ search, status, priority, due }: { search: string; status: string; priority: string; due: string }) {
  const controller = useDebouncedUrlSearch({ initialSearch: search });
  const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/40 sm:w-auto";
  const hasFilters = Boolean(controller.search.trim() || status || priority || due);
  const activeCount = [controller.search.trim(), status, priority, due].filter(Boolean).length;
  const update = (values: Record<string, string | null>) => controller.replace(values);
  const clear = () => {
    controller.clear({ search: null, status: null, priority: null, due: null });
  };
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border bg-background p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center" aria-busy={controller.isPending} data-testid="tasks-filter-toolbar">
      <SearchInput value={controller.search} onChange={controller.setSearch} onCommit={controller.commitSearch} onClear={controller.clearSearch} isPending={controller.isPending} inputRef={controller.inputRef} placeholder="Search task title or related record" ariaLabel="Search tasks" className="w-full min-w-0 sm:min-w-[16rem] sm:flex-1" testId="tasks-search-input" />
      <ResponsiveFilterPanel activeCount={activeCount} className="min-w-0 flex-1 sm:justify-end">
      <label className="w-full sm:w-auto"><span className="sr-only">Status</span><select key={status} defaultValue={status} onChange={(event) => update({ status: event.target.value || null })} className={selectClass} aria-label="Status"><option value="">All statuses</option><option value="pending">Pending</option><option value="completed">Completed</option></select></label>
      <label className="w-full sm:w-auto"><span className="sr-only">Priority</span><select key={priority} defaultValue={priority} onChange={(event) => update({ priority: event.target.value || null })} className={selectClass} aria-label="Priority"><option value="">All priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
      <label className="w-full sm:w-auto"><span className="sr-only">Due date</span><select key={due} defaultValue={due} onChange={(event) => update({ due: event.target.value || null })} className={selectClass} aria-label="Due date"><option value="">Any due date</option><option value="today">Due today</option><option value="overdue">Overdue</option><option value="upcoming">Upcoming</option><option value="none">No due date</option></select></label>
      {hasFilters ? <ClearFiltersButton onClear={clear} disabled={controller.isPending} /> : null}
      </ResponsiveFilterPanel>
    </div>
  );
}
