import Link from "next/link";
import { Plus } from "lucide-react";
import { getLeadsList } from "@/app/dashboard/leads/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyLeadsState } from "@/components/leads/empty-leads-state";
import { ExportLeadsMenu } from "@/components/leads/export-leads-menu";
import { LeadFilters } from "@/components/leads/lead-filters";
import { LeadsTable } from "@/components/leads/leads-table";
import { Button } from "@/components/ui/button";

type LeadsPageProps = {
  searchParams?: Promise<{
    search?: string;
    status?: string;
    source?: string;
    sortBy?: string;
    sortDir?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const params = (await searchParams) ?? {};

  const tableData = await getLeadsList({
    search: params.search,
    status: params.status,
    source: params.source,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
    page: params.page,
    pageSize: params.pageSize,
  });

  const hasFilters = Boolean(
    tableData.search.trim() || tableData.status.trim() || tableData.source.trim(),
  );
  const rangeStart = tableData.totalCount === 0 ? 0 : (tableData.page - 1) * tableData.pageSize + 1;
  const rangeEnd = Math.min(tableData.page * tableData.pageSize, tableData.totalCount);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1 [scrollbar-gutter:stable] sm:gap-6">
      <PageHeader
        eyebrow="Lead management"
        title="Leads"
        description="Search, filter, and manage every lead from one clean workspace."
        className="shrink-0"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportLeadsMenu buttonLabel="Export leads" testId="export-all-leads" />
            <Button asChild data-testid="add-lead-btn">
              <Link href="/dashboard/leads/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Lead
              </Link>
            </Button>
          </div>
        }
      />

      <div className="shrink-0 rounded-3xl border bg-background p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {tableData.totalCount === 0
              ? "No leads found"
              : `Showing ${rangeStart}-${rangeEnd} of ${tableData.totalCount} leads`}
          </p>
        </div>

        <LeadFilters
          initialSearch={tableData.search}
          initialStatus={tableData.status}
          initialSource={tableData.source}
          sourceOptions={tableData.sourceOptions}
        />
      </div>

      {tableData.totalCount === 0 ? (
        <div className="min-h-0 flex-1">
          <EmptyLeadsState hasFilters={hasFilters} />
        </div>
      ) : (
        <LeadsTable
          leads={tableData.leads}
          totalCount={tableData.totalCount}
          page={tableData.page}
          pageCount={tableData.pageCount}
          pageSize={tableData.pageSize}
          sortBy={tableData.sortBy}
          sortDir={tableData.sortDir}
        />
      )}
    </div>
  );
}
