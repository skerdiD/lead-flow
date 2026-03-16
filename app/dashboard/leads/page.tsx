import Link from "next/link";
import { Plus } from "lucide-react";
import { getLeadsList } from "@/app/dashboard/leads/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyLeadsState } from "@/components/leads/empty-leads-state";
import { LeadFilters } from "@/components/leads/lead-filters";
import { LeadsTable } from "@/components/leads/leads-table";
import { Button } from "@/components/ui/button";

type LeadsPageProps = {
  searchParams?: Promise<{
    search?: string;
    status?: string;
  }>;
};

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const params = (await searchParams) ?? {};
  const search = params.search ?? "";
  const status = params.status ?? "";

  const userLeads = await getLeadsList({ search, status });
  const hasFilters = Boolean(search.trim() || status.trim());

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Lead management"
        title="Leads"
        description="Search, filter, and manage every lead from one clean workspace."
        action={
          <Button asChild>
            <Link href="/dashboard/leads/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Lead
            </Link>
          </Button>
        }
      />

      <div className="rounded-3xl border bg-background p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {userLeads.length} {userLeads.length === 1 ? "lead" : "leads"} shown
          </p>
        </div>

        <LeadFilters initialSearch={search} initialStatus={status} />
      </div>

      {userLeads.length === 0 ? (
        <EmptyLeadsState hasFilters={hasFilters} />
      ) : (
        <LeadsTable leads={userLeads} />
      )}
    </div>
  );
}