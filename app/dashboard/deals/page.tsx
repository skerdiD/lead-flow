import Link from "next/link";
import { Plus } from "lucide-react";
import { getDealsPipeline } from "@/app/dashboard/deals/queries";
import { DealsPipeline } from "@/components/deals/deals-pipeline";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { hasWorkspacePermission } from "@/lib/authorization";
import { isDemoWorkspace } from "@/lib/demo";
import { getCurrentWorkspace } from "@/lib/workspaces";

export default async function DealsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) { const params = await searchParams; const [data, workspace] = await Promise.all([getDealsPipeline(params), getCurrentWorkspace()]); const canUpdate = hasWorkspacePermission(workspace.role, "crm:update_all") || hasWorkspacePermission(workspace.role, "crm:update_assigned"); return <div className="space-y-5"><PageHeader eyebrow="Revenue pipeline" title="Deals" description="Move active opportunities through a clear, shared sales pipeline." action={!isDemoWorkspace(workspace) && hasWorkspacePermission(workspace.role, "crm:create") ? <Button asChild><Link href="/dashboard/deals/new"><Plus className="mr-2 h-4 w-4" />Create deal</Link></Button> : undefined} /><form className="flex flex-wrap gap-2 rounded-3xl border bg-background p-4 shadow-sm"><input name="search" defaultValue={params.search ?? ""} className="h-9 min-w-52 flex-1 rounded-md border bg-transparent px-3 text-sm" placeholder="Search deal, account, or contact" /><select name="state" defaultValue={params.state ?? ""} className="h-9 rounded-md border bg-transparent px-2 text-sm"><option value="">All deals</option><option value="open">Open</option><option value="closed">Closed</option></select><Button size="sm" variant="outline">Apply filters</Button>{params.search || params.state ? <Button asChild size="sm" variant="ghost"><Link href="/dashboard/deals">Reset</Link></Button> : null}</form><DealsPipeline initialBoard={data.grouped} initialTotals={data.totals} readOnly={!canUpdate || isDemoWorkspace(workspace)} /></div>; }
