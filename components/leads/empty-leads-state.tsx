import Link from "next/link";
import { Inbox, Plus, SearchX, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyLeadsStateProps = {
  hasFilters: boolean;
};

export function EmptyLeadsState({ hasFilters }: EmptyLeadsStateProps) {
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
          {hasFilters ? "No matching leads" : "Your pipeline is empty"}
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {hasFilters
            ? "No leads matched your current search and filters. Try broadening stage or source to surface more results."
            : "Start by adding your first lead. Once records are in, you can sort, filter, and manage them from one table."}
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/dashboard/leads/new">
              <Plus className="mr-2 h-4 w-4" />
              Add lead
            </Link>
          </Button>

          {hasFilters ? (
            <Button asChild variant="outline">
              <Link href="/dashboard/leads">Clear filters</Link>
            </Button>
          ) : null}
        </div>

        {!hasFilters ? (
          <div className="mt-8 rounded-2xl border bg-muted/30 px-4 py-3 text-left">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              Tips for a clean start
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Capture name, stage, and source first. You can enrich details later without slowing intake.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
