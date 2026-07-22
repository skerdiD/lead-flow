import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { getAccountsList, getCrmListFilterOptions } from "@/app/dashboard/crm-queries";
import { CrmListFilters } from "@/components/customers/crm-list-filters";
import { ListPagination } from "@/components/filters/list-pagination";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { formatCurrencyFromCents } from "@/lib/revenue";
import { hasWorkspacePermission } from "@/lib/authorization";
import { isDemoWorkspace } from "@/lib/demo";
import { getCurrentWorkspace } from "@/lib/workspaces";

export default async function AccountsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const [data, workspace, options] = await Promise.all([getAccountsList(params), getCurrentWorkspace(), getCrmListFilterOptions()]);
  const canCreate = hasWorkspacePermission(workspace.role, "crm:create");
  const canImport = hasWorkspacePermission(workspace.role, "crm:import") && !isDemoWorkspace(workspace);
  const hasFilters = Boolean(data.search || data.owner || data.archived === "archived");

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader eyebrow="Relationship management" title="Accounts" description="See each company alongside its contacts and open deals." action={<>{canImport ? <Button asChild variant="outline"><Link href="/dashboard/import"><Upload className="mr-2 h-4 w-4" />Import CSV</Link></Button> : null}{canCreate ? <Button asChild><Link href="/dashboard/customers/accounts/new"><Plus className="mr-2 h-4 w-4" />Add account</Link></Button> : null}</>} />
      <CrmListFilters kind="accounts" initialSearch={data.search} initialOwner={data.owner} initialArchived={data.archived} initialSort={data.sort} initialDirection={data.direction} ownerOptions={options.ownerOptions} />

      {data.records.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center">
          <h2 className="font-semibold">{hasFilters ? "No accounts match your search." : "No accounts yet"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{hasFilters ? "Try another search or clear the filters." : "Add an account to connect people, pipeline, and follow-up work."}</p>
        </div>
      ) : (
        <section className="space-y-3" aria-label="Account results">
          <div className="hidden overflow-hidden rounded-3xl border bg-background shadow-sm md:block">
            <table className="w-full table-fixed text-sm"><thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-4">Account</th><th className="p-4">Connected CRM</th><th className="p-4">Open pipeline</th><th className="p-4">Owner</th><th className="p-4">Updated</th></tr></thead><tbody>{data.records.map((record) => <tr key={record.id} className="border-b last:border-0 hover:bg-muted/20"><td className="min-w-0 p-4"><Link href={`/dashboard/customers/accounts/${record.id}`} className="block truncate font-semibold hover:text-primary">{record.name}</Link><p className="mt-1 truncate text-xs text-muted-foreground">{record.industry ?? record.website ?? "No industry set"}</p></td><td className="p-4 text-muted-foreground">{record.contactCount} contacts · {record.leadCount} leads · {record.dealCount} deals</td><td className="p-4 font-medium">{formatCurrencyFromCents(record.pipelineValueCents, "USD")}</td><td className="truncate p-4 text-muted-foreground">{record.assignedOwnerUserId ?? "Unassigned"}</td><td className="p-4 text-muted-foreground">{record.updatedAt.toLocaleDateString()}</td></tr>)}</tbody></table>
          </div>
          <div className="grid gap-3 md:hidden">{data.records.map((record) => <article key={record.id} className="min-w-0 rounded-2xl border bg-background p-4"><Link href={`/dashboard/customers/accounts/${record.id}`} className="font-semibold hover:text-primary">{record.name}</Link><p className="mt-1 truncate text-sm text-muted-foreground">{record.industry ?? record.website ?? "No industry set"}</p><p className="mt-3 text-sm">{record.contactCount} contacts · {record.dealCount} deals</p><p className="mt-1 text-sm font-medium">{formatCurrencyFromCents(record.pipelineValueCents, "USD")} open pipeline</p></article>)}</div>
          <ListPagination page={data.page} pageCount={data.pageCount} totalCount={data.totalCount} pageSize={data.pageSize} />
        </section>
      )}
    </div>
  );
}
