import Link from "next/link";
import { ArrowRight, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardEmptyState() {
  return (
    <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-muted/30 p-8 shadow-sm">
      <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-muted/70 blur-3xl" />

      <div className="relative mx-auto max-w-2xl text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border bg-background/80">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>

        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
          Start building your pipeline
        </h2>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          LeadFlow works best when every opportunity is tracked in one place. Add your first lead to unlock
          search, filtering, statuses, and a cleaner sales workflow.
        </p>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/dashboard/leads/new">
              <Plus className="mr-2 h-4 w-4" />
              Add your first lead
            </Link>
          </Button>

          <Button asChild variant="outline">
            <Link href="/dashboard/leads">
              View leads
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
