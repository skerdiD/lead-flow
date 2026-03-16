import Link from "next/link";
import { Clock3, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ActivityEmptyState() {
  return (
    <section className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed bg-background px-6 py-12 shadow-sm">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted/40">
          <Clock3 className="h-6 w-6 text-muted-foreground" />
        </div>

        <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
          No activity yet
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Recent lead actions will appear here so you can track what changed
          without opening each record.
        </p>

        <div className="mt-6">
          <Button asChild>
            <Link href="/dashboard/leads/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Lead
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
