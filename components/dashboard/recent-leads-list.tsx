import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { Button } from "@/components/ui/button";
import type { LeadStatus } from "@/lib/constants/leads";

type RecentLead = {
  id: string;
  fullName: string;
  company: string | null;
  status: LeadStatus;
  createdAt: Date;
};

type RecentLeadsListProps = {
  leads: RecentLead[];
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function RecentLeadsList({ leads }: RecentLeadsListProps) {
  if (leads.length === 0) {
    return (
      <section className="rounded-3xl border bg-background p-6 shadow-sm">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Recent leads</h3>
          <p className="text-sm leading-6 text-muted-foreground">
            Your newest leads will appear here once you start adding them.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-muted/20 p-6 shadow-sm">
      <div className="pointer-events-none absolute -right-12 top-0 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Recent leads</h3>
          <p className="text-sm leading-6 text-muted-foreground">
            A quick view of the latest contacts added to your pipeline.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/dashboard/leads">
            View all leads
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="relative mt-6 divide-y rounded-2xl border bg-background/70 px-3">
        {leads.map((lead) => (
          <Link
            key={lead.id}
            href={`/dashboard/leads/${lead.id}`}
            className="group flex flex-col gap-3 py-4 transition-colors hover:bg-muted/20 sm:-mx-3 sm:px-3 md:flex-row md:items-center md:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <p className="truncate font-medium text-foreground group-hover:text-primary">
                {lead.fullName}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {lead.company || "No company added"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <LeadStatusBadge status={lead.status} />
              <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                {formatDate(lead.createdAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
