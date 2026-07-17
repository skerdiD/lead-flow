import Link from "next/link";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { auditLogs } from "@/db/schema";
import { db } from "@/db";
import { hasWorkspacePermission } from "@/lib/authorization";
import { getCurrentWorkspace } from "@/lib/workspaces";

const PAGE_SIZE = 40;

function value(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [workspace, params] = await Promise.all([getCurrentWorkspace(), searchParams]);
  if (!hasWorkspacePermission(workspace.role, "workspace:manage")) notFound();

  const action = value(params.action);
  const entityType = value(params.entityType);
  const actor = value(params.actor);
  const entityId = value(params.entityId);
  const page = Math.max(1, Number(value(params.page)) || 1);
  const conditions = [eq(auditLogs.workspaceId, workspace.id)];
  if (action) conditions.push(eq(auditLogs.action, action));
  if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
  if (actor) conditions.push(eq(auditLogs.actorUserId, actor));
  if (entityId) conditions.push(or(eq(auditLogs.entityId, entityId), sql`${auditLogs.metadata}::text ilike ${`%${entityId.replace(/[%_\\]/g, "\\$&")}%`}`)!);

  const rows = await db.select().from(auditLogs).where(and(...conditions)).orderBy(desc(auditLogs.createdAt)).limit(PAGE_SIZE + 1).offset((page - 1) * PAGE_SIZE);
  const hasNextPage = rows.length > PAGE_SIZE;
  const visibleRows = rows.slice(0, PAGE_SIZE);
  const query = new URLSearchParams();
  for (const [key, item] of Object.entries({ action, entityType, actor, entityId })) if (item) query.set(key, item);
  const pageHref = (targetPage: number) => `/dashboard/settings/audit-log?${new URLSearchParams({ ...Object.fromEntries(query), page: String(targetPage) })}`;

  return <div className="space-y-6"><PageHeader eyebrow="Workspace security" title="Audit log" description="Immutable, structured records of sensitive workspace and CRM changes. User activity remains separate in the activity feed." /><form className="grid gap-3 rounded-2xl border bg-muted/20 p-4 md:grid-cols-4"><input name="action" defaultValue={action} placeholder="Action" className="h-10 rounded-md border bg-background px-3 text-sm" /><input name="entityType" defaultValue={entityType} placeholder="Entity type" className="h-10 rounded-md border bg-background px-3 text-sm" /><input name="actor" defaultValue={actor} placeholder="Actor ID" className="h-10 rounded-md border bg-background px-3 text-sm" /><input name="entityId" defaultValue={entityId} placeholder="Entity ID or label" className="h-10 rounded-md border bg-background px-3 text-sm" /><div className="md:col-span-4"><Button type="submit" variant="outline">Filter records</Button></div></form><section className="overflow-hidden rounded-2xl border"><div className="divide-y">{visibleRows.length ? visibleRows.map((record) => <details key={record.id} className="group px-4 py-3"><summary className="cursor-pointer list-none"><div className="flex flex-col justify-between gap-1 sm:flex-row"><span className="font-medium">{record.action}</span><span className="font-mono text-xs text-muted-foreground">{record.createdAt.toISOString()} · {record.requestId}</span></div><p className="mt-1 text-sm text-muted-foreground">{record.entityType} · {record.entityId ?? "workspace-level"} · actor {record.actorUserId} ({record.actorRole})</p></summary><pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs leading-5">{JSON.stringify({ before: record.before, after: record.after, metadata: record.metadata }, null, 2)}</pre></details>) : <p className="px-4 py-10 text-center text-sm text-muted-foreground">No audit records match these filters.</p>}</div></section><div className="flex items-center justify-between"><Button asChild variant="outline" disabled={page === 1}><Link href={pageHref(page - 1)}>Previous</Link></Button><p className="text-sm text-muted-foreground">Page {page}</p><Button asChild variant="outline" disabled={!hasNextPage}><Link href={pageHref(page + 1)}>Next</Link></Button></div></div>;
}
