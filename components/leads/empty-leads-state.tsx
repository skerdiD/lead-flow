import Link from "next/link";
import { Inbox, ListChecks, Plus, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyLeadsStateProps = {
  hasFilters: boolean;
  canCreate?: boolean;
};

export function EmptyLeadsState({
  hasFilters,
  canCreate = false,
}: EmptyLeadsStateProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-dashed bg-background px-6 py-12 shadow-sm">
      <div className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-muted/50 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-muted/40 blur-3xl" />

      <div className="relative mx-auto max-w-lg text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted/40">
          {hasFilters ? (
            <SearchX className="h-6 w-6 text-muted-foreground" />
          ) : (
            <Inbox className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
          {hasFilters ? "No leads match your search." : "No leads yet"}
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {hasFilters
            ? "Try another search or clear your filters."
            : "Add a lead to start your pipeline. You can update it as the conversation progresses."}
        </p>

        <div className="mt-6 flex items-center justify-center">
          {hasFilters ? (
            <Button asChild>
              <Link href="/dashboard/leads">Clear filters</Link>
            </Button>
          ) : canCreate ? (
            <Button asChild>
              <Link href="/dashboard/leads/new">
                <Plus className="mr-2 h-4 w-4" />
                Add lead
              </Link>
            </Button>
          ) : null}
        </div>

        {!hasFilters ? (
          <div className="mt-8 rounded-2xl border bg-muted/30 px-4 py-3 text-left">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              A useful first record
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Start with a name, stage, and source. Add detail when you have it.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
