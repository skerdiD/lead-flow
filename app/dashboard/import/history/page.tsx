import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { ImportUnavailable } from "@/components/imports/import-wizard";
import { ImportHistoryFilters } from "@/components/imports/import-history-filters";
import { ListPagination } from "@/components/filters/list-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasWorkspacePermission } from "@/lib/authorization";
import { isDemoWorkspace } from "@/lib/demo";
import { getImportHistory } from "@/lib/imports/server";
import { getCurrentWorkspace } from "@/lib/workspaces";

function duration(startedAt: Date | null, completedAt: Date | null) {
  if (!startedAt || !completedAt) return "—";
  const seconds = Math.max(0, Math.round((completedAt.getTime() - startedAt.getTime()) / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export default async function ImportHistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const workspace = await getCurrentWorkspace();
  if (!hasWorkspacePermission(workspace.role, "crm:import")) notFound();
  if (isDemoWorkspace(workspace)) return <ImportUnavailable demo />;
  const data = await getImportHistory(params);
  const hasFilters = Object.values(data.filters).some(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Data management"
        title="Import history"
        description="Check recent CSV imports, their results, and any rejected rows."
        action={<Button asChild variant="outline"><Link href="/dashboard/import"><ArrowLeft className="mr-2 h-4 w-4" />New import</Link></Button>}
      />
      <ImportHistoryFilters {...data.filters} />
      {data.jobs.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center">
          <h2 className="font-semibold">{hasFilters ? "No imports match your search." : "No imports yet"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{hasFilters ? "Try another search or clear your filters." : "Your completed and in-progress CSV imports will appear here."}</p>
        </div>
      ) : (<>
        <div className="hidden overflow-hidden rounded-3xl border bg-background shadow-sm md:block">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="p-4">Date and file</th><th className="p-4">Type</th><th className="p-4">Actor</th><th className="p-4">Status</th><th className="p-4">Imported</th><th className="p-4">Updated</th><th className="p-4">Skipped</th><th className="p-4">Failed</th><th className="p-4">Duration</th><th className="p-4"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {data.jobs.map((job) => (
                <tr key={job.id} className="border-b last:border-0">
                  <td className="p-4"><p className="font-medium">{job.originalFileName}</p><p className="mt-1 text-xs text-muted-foreground">{job.createdAt.toLocaleString()}</p></td>
                  <td className="p-4 capitalize">{job.entityType}</td>
                  <td className="p-4 text-muted-foreground">{job.actorName}</td>
                  <td className="p-4"><Badge variant="outline" className="capitalize">{job.status}</Badge></td>
                  <td className="p-4">{job.importedRows}</td>
                  <td className="p-4">{job.updatedRows}</td>
                  <td className="p-4">{job.skippedRows}</td>
                  <td className="p-4">{job.failedRows}</td>
                  <td className="p-4 text-muted-foreground">{duration(job.startedAt, job.completedAt)}</td>
                  <td className="p-4"><Button asChild size="sm" variant="ghost"><Link href={`/dashboard/settings/imports/${job.id}`}><Eye className="mr-2 h-4 w-4" />View results</Link></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 md:hidden">
          {data.jobs.map((job) => <article key={job.id} className="min-w-0 rounded-2xl border bg-background p-4 shadow-sm"><div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-medium">{job.originalFileName}</p><p className="mt-1 text-xs text-muted-foreground">{job.createdAt.toLocaleString()} · {job.actorName}</p></div><Badge variant="outline" className="shrink-0 capitalize">{job.status}</Badge></div><p className="mt-3 text-sm capitalize">{job.entityType} · {duration(job.startedAt, job.completedAt)}</p><p className="mt-1 text-xs text-muted-foreground">{job.importedRows} imported · {job.updatedRows} updated · {job.failedRows} failed</p><Button asChild size="sm" variant="ghost" className="mt-3"><Link href={`/dashboard/settings/imports/${job.id}`}><Eye className="mr-2 h-4 w-4" />View results</Link></Button></article>)}
        </div>
      </>)}
      {data.totalCount > 0 ? <ListPagination page={data.page} pageCount={data.pageCount} totalCount={data.totalCount} pageSize={data.pageSize} /> : null}
    </div>
  );
}
