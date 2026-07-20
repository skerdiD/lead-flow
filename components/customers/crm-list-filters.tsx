"use client";

import { ClearFiltersButton } from "@/components/filters/clear-filters-button";
import { SearchInput } from "@/components/filters/search-input";
import { useDebouncedUrlSearch } from "@/components/filters/use-debounced-url-search";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

export function CrmListFilters({
  kind,
  initialSearch,
  initialOwner = "",
  initialAccount = "",
  initialArchived = "active",
  initialSort = "updated",
  initialDirection = "desc",
  ownerOptions = [],
  accountOptions = [],
}: {
  kind: "accounts" | "contacts";
  initialSearch: string;
  initialOwner?: string;
  initialAccount?: string;
  initialArchived?: "active" | "archived";
  initialSort?: "name" | "updated";
  initialDirection?: "asc" | "desc";
  ownerOptions?: Option[];
  accountOptions?: Option[];
}) {
  const controller = useDebouncedUrlSearch({ initialSearch });
  const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/40 sm:w-auto";
  const hasFilters = Boolean(controller.search.trim() || initialOwner || initialAccount || initialArchived === "archived");
  const update = (values: Record<string, string | null>) => controller.replace(values);
  const clear = () => {
    controller.clear({ search: null, owner: null, account: null, archived: null });
  };
  const placeholder = kind === "accounts"
    ? "Search account name, domain, or industry"
    : "Search name, email, phone, or account";

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border bg-background p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center" aria-busy={controller.isPending} data-testid={`${kind}-filter-toolbar`}>
      <SearchInput value={controller.search} onChange={controller.setSearch} onCommit={controller.commitSearch} onClear={controller.clearSearch} isPending={controller.isPending} inputRef={controller.inputRef} placeholder={placeholder} ariaLabel={`Search ${kind}`} className="w-full min-w-0 sm:min-w-[16rem] sm:flex-1" testId={`${kind}-search-input`} />
      {ownerOptions.length > 0 ? (
        <label className="w-full sm:w-auto"><span className="sr-only">Owner</span><select key={initialOwner} defaultValue={initialOwner} onChange={(event) => update({ owner: event.target.value || null })} className={cn(selectClass, "sm:w-[10rem]")} aria-label="Owner"><option value="">All owners</option>{ownerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      ) : null}
      {kind === "contacts" && accountOptions.length > 0 ? (
        <label className="w-full sm:w-auto"><span className="sr-only">Account</span><select key={initialAccount} defaultValue={initialAccount} onChange={(event) => update({ account: event.target.value || null })} className={cn(selectClass, "sm:w-[11rem]")} aria-label="Account"><option value="">All accounts</option>{accountOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      ) : null}
      <label className="w-full sm:w-auto"><span className="sr-only">Record view</span><select key={initialArchived} defaultValue={initialArchived} onChange={(event) => update({ archived: event.target.value === "archived" ? "archived" : null })} className={cn(selectClass, "sm:w-[10rem]")} aria-label="Record view"><option value="active">Active</option><option value="archived">Archived</option></select></label>
      <label className="w-full sm:w-auto"><span className="sr-only">Sort</span><select key={`${initialSort}:${initialDirection}`} defaultValue={`${initialSort}:${initialDirection}`} onChange={(event) => { const [sort, direction] = event.target.value.split(":"); update({ sort, direction }); }} className={cn(selectClass, "sm:w-[11rem]")} aria-label="Sort"><option value="updated:desc">Recently updated</option><option value="name:asc">Name A-Z</option><option value="name:desc">Name Z-A</option></select></label>
      {hasFilters ? <ClearFiltersButton onClear={clear} disabled={controller.isPending} /> : null}
    </div>
  );
}
