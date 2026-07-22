import Link from "next/link";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { AuditLogFilters } from "@/components/settings/audit-log-filters";
import { Button } from "@/components/ui/button";
import { auditLogs } from "@/db/schema";
import { db } from "@/db";
import { hasWorkspacePermission } from "@/lib/authorization";
import { normalizeSearchParam, updateSearchParams } from "@/lib/list-query-state";
import { getCurrentWorkspace } from "@/lib/workspaces";

const PAGE_SIZE = 40;

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [workspace, params] = await Promise.all([getCurrentWorkspace(), searchParams]);
  if (!hasWorkspacePermission(workspace.role, "workspace:manage")) notFound();

  const search = normalizeSearchParam(params.search);
  const requestedPage = Math.max(1, Number(typeof params.page === "string" ? params.page : "1") || 1);
  const conditions = [eq(auditLogs.workspaceId, workspace.id)];
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(or(
      ilike(auditLogs.action, pattern),
      ilike(auditLogs.entityType, pattern),
      ilike(auditLogs.actorUserId, pattern),
      ilike(auditLogs.entityId, pattern),
      sql`${auditLogs.metadata}::text ilike ${pattern}`,
    )!);
  }

  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(and(...conditions));
  const totalCount = Number(countRow?.count ?? 0);
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const rows = await db.select().from(auditLogs).where(and(...conditions)).orderBy(desc(auditLogs.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);
  const pageHref = (targetPage: number) => {
    const query = updateSearchParams(new URLSearchParams(search ? { search } : {}), { page: targetPage }, { resetPage: false });
    return `/dashboard/settings/audit-log?${query}`;
  };

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader eyebrow="Workspace security" title="Audit log" description="A record of sensitive workspace and CRM changes. General activity appears in the activity feed." />
      <AuditLogFilters search={search} />
      <section className="overflow-hidden rounded-2xl border" aria-label="Audit results">
        <div className="divide-y">
          {rows.length ? rows.map((record) => (
            <details key={record.id} className="group min-w-0 px-4 py-3">
              <summary className="cursor-pointer list-none"><div className="flex min-w-0 flex-col justify-between gap-1 sm:flex-row"><span className="break-words font-medium">{record.action}</span><span className="break-all font-mono text-xs text-muted-foreground">{record.createdAt.toISOString()} · {record.requestId}</span></div><p className="mt-1 break-all text-sm text-muted-foreground">{record.entityType} · {record.entityId ?? "workspace-level"} · actor {record.actorUserId} ({record.actorRole})</p></summary>
              <pre className="mt-3 max-h-80 max-w-full overflow-auto rounded-lg bg-muted p-3 text-xs leading-5">{JSON.stringify({ before: record.before, after: record.after, metadata: record.metadata }, null, 2)}</pre>
            </details>
          )) : (
            <div className="px-4 py-10 text-center"><p className="font-medium">{search ? "No audit records match your search." : "No audit records yet."}</p>{search ? <p className="mt-2 text-sm text-muted-foreground">Try another search or clear the filters.</p> : null}</div>
          )}
        </div>
      </section>
      {totalCount > 0 ? <div className="flex items-center justify-between"><Button asChild variant="outline" disabled={page === 1}><Link href={pageHref(page - 1)}>Previous</Link></Button><p className="text-sm text-muted-foreground">Page {page} of {pageCount}</p><Button asChild variant="outline" disabled={page === pageCount}><Link href={pageHref(page + 1)}>Next</Link></Button></div> : null}
    </div>
  );
}
