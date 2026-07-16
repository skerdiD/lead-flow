import Link from "next/link";
import { Plus } from "lucide-react";
import { getLeadsList } from "@/app/dashboard/leads/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { DemoReadOnlyHint } from "@/components/demo/demo-read-only-hint";
import { EmptyLeadsState } from "@/components/leads/empty-leads-state";
import { ExportLeadsMenu } from "@/components/leads/export-leads-menu";
import { LeadFilters } from "@/components/leads/lead-filters";
import { LeadsTable } from "@/components/leads/leads-table";
import { Button } from "@/components/ui/button";
import { isDemoWorkspace } from "@/lib/demo";
import { hasWorkspacePermission } from "@/lib/authorization";
import { getCurrentWorkspace } from "@/lib/workspaces";

type LeadsPageProps = {
  searchParams?: Promise<{
    search?: string;
    status?: string;
    source?: string;
    archived?: string;
    sortBy?: string;
    sortDir?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const params = (await searchParams) ?? {};
  const workspace = await getCurrentWorkspace();
  const readOnly = isDemoWorkspace(workspace);
  const canExport = hasWorkspacePermission(workspace.role, "exports:create");
  const canUpdate = hasWorkspacePermission(workspace.role, "crm:update_all") || hasWorkspacePermission(workspace.role, "crm:update_assigned");
  const canDelete = hasWorkspacePermission(workspace.role, "crm:delete");

  const tableData = await getLeadsList({
    search: params.search,
    status: params.status,
    source: params.source,
    archived: params.archived,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
    page: params.page,
    pageSize: params.pageSize,
  });

  const hasFilters = Boolean(
    tableData.search.trim() ||
      tableData.status.trim() ||
      tableData.source.trim() ||
      tableData.archived === "archived",
  );
  const isArchiveView = tableData.archived === "archived";
  const rangeStart = tableData.totalCount === 0 ? 0 : (tableData.page - 1) * tableData.pageSize + 1;
  const rangeEnd = Math.min(tableData.page * tableData.pageSize, tableData.totalCount);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        eyebrow="Lead management"
        title="Leads"
        description={
          isArchiveView
            ? "Review archived leads and restore records when they need to return to active work."
            : "Search, filter, and manage your leads."
        }
        className="shrink-0"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {canExport ? <ExportLeadsMenu buttonLabel="Export leads" testId="export-all-leads" /> : null}
            {!readOnly ? (
              <Button asChild data-testid="add-lead-btn">
                <Link href="/dashboard/leads/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lead
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      {readOnly ? <DemoReadOnlyHint /> : null}

      <div className="shrink-0 rounded-3xl border bg-background p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {tableData.totalCount === 0
              ? "No leads found"
              : `Showing ${rangeStart}-${rangeEnd} of ${tableData.totalCount} ${isArchiveView ? "archived " : ""}leads`}
          </p>
        </div>

        <LeadFilters
          initialSearch={tableData.search}
          initialStatus={tableData.status}
          initialSource={tableData.source}
          initialArchived={tableData.archived}
          sourceOptions={tableData.sourceOptions}
        />
      </div>

      {tableData.totalCount === 0 ? (
        <EmptyLeadsState hasFilters={hasFilters} archiveView={isArchiveView} />
      ) : (
        <LeadsTable
          leads={tableData.leads}
          totalCount={tableData.totalCount}
          page={tableData.page}
          pageCount={tableData.pageCount}
          pageSize={tableData.pageSize}
          sortBy={tableData.sortBy}
          sortDir={tableData.sortDir}
          archiveView={isArchiveView}
          readOnly={readOnly}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canExport={canExport}
        />
      )}
    </div>
  );
}
