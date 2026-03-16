import Link from "next/link";
import { Plus } from "lucide-react";
import { getLeadsList } from "@/app/dashboard/leads/queries";
import { EmptyLeadsState } from "@/components/leads/empty-leads-state";
import { LeadsFilters } from "@/components/leads/leads-filters";
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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Lead management</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Leads
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Search, filter, and manage every lead from one clean workspace.
          </p>
        </div>

        <Button asChild>
          <Link href="/dashboard/leads/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Link>
        </Button>
      </div>

      <div className="rounded-3xl border bg-background p-4 shadow-sm sm:p-5">
        <LeadsFilters initialSearch={search} initialStatus={status} />
      </div>

      {userLeads.length === 0 ? (
        <EmptyLeadsState hasFilters={hasFilters} />
      ) : (
        <LeadsTable leads={userLeads} />
      )}
    </div>
  );
}