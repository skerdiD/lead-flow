import Link from "next/link";
import { Inbox, Plus, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyLeadsStateProps = {
  hasFilters: boolean;
};

export function EmptyLeadsState({ hasFilters }: EmptyLeadsStateProps) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed bg-background px-6 py-12 shadow-sm">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted/40">
          {hasFilters ? (
            <SearchX className="h-6 w-6 text-muted-foreground" />
          ) : (
            <Inbox className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
          {hasFilters ? "No matching leads" : "No leads yet"}
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {hasFilters
            ? "Try adjusting your search or status filter to find what you’re looking for."
            : "Your leads list is empty. Add your first lead to start building a clean, trackable pipeline."}
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/dashboard/leads/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Lead
            </Link>
          </Button>

          {hasFilters ? (
            <Button asChild variant="outline">
              <Link href="/dashboard/leads">Clear filters</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}