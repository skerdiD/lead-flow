import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { getAccountsList } from "@/app/dashboard/crm-queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrencyFromCents } from "@/lib/revenue";
import { hasWorkspacePermission } from "@/lib/authorization";
import { getCurrentWorkspace } from "@/lib/workspaces";

export default async function AccountsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams; const [data, workspace] = await Promise.all([getAccountsList(params), getCurrentWorkspace()]); const canCreate = hasWorkspacePermission(workspace.role, "crm:create");
  return <div className="space-y-5"><PageHeader eyebrow="Relationship management" title="Accounts" description="Keep companies, their contacts, and active opportunities connected in one place." action={canCreate ? <Button asChild><Link href="/dashboard/accounts/new"><Plus className="mr-2 h-4 w-4" />Add account</Link></Button> : undefined} />
    <form className="flex flex-wrap gap-3 rounded-3xl border bg-background p-4 shadow-sm"><div className="relative min-w-56 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input name="search" defaultValue={data.search} className="pl-9" placeholder="Search accounts or industry" /></div><Button variant="outline">Search</Button>{data.search ? <Button asChild variant="ghost"><Link href="/dashboard/accounts">Clear</Link></Button> : null}</form>
    {data.records.length === 0 ? <div className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center"><h2 className="font-semibold">No accounts found</h2><p className="mt-2 text-sm text-muted-foreground">Create an account to connect people, pipeline, and follow-up work.</p></div> : <div className="overflow-x-auto rounded-3xl border bg-background shadow-sm"><table className="w-full min-w-[780px] text-sm"><thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-4">Account</th><th className="p-4">Connected CRM</th><th className="p-4">Open pipeline</th><th className="p-4">Owner</th><th className="p-4">Updated</th></tr></thead><tbody>{data.records.map((record) => <tr key={record.id} className="border-b last:border-0 hover:bg-muted/20"><td className="p-4"><Link href={`/dashboard/accounts/${record.id}`} className="font-semibold hover:text-primary">{record.name}</Link><p className="mt-1 text-xs text-muted-foreground">{record.industry ?? record.website ?? "No industry set"}</p></td><td className="p-4 text-muted-foreground">{record.contactCount} contacts · {record.leadCount} leads · {record.dealCount} deals</td><td className="p-4 font-medium">{formatCurrencyFromCents(record.pipelineValueCents, "USD")}</td><td className="p-4 text-muted-foreground">{record.assignedOwnerUserId ?? "Unassigned"}</td><td className="p-4 text-muted-foreground">{record.updatedAt.toLocaleDateString()}</td></tr>)}</tbody></table></div>}
  </div>;
}
