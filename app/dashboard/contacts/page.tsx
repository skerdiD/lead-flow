import Link from "next/link";
import { Plus, Search, Upload } from "lucide-react";
import { getContactsList } from "@/app/dashboard/crm-queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasWorkspacePermission } from "@/lib/authorization";
import { isDemoWorkspace } from "@/lib/demo";
import { getCurrentWorkspace } from "@/lib/workspaces";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const [data, workspace] = await Promise.all([
    getContactsList(params),
    getCurrentWorkspace(),
  ]);
  const canCreate = hasWorkspacePermission(workspace.role, "crm:create");
  const canImport =
    hasWorkspacePermission(workspace.role, "crm:import") &&
    !isDemoWorkspace(workspace);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Relationship management"
        title="Contacts"
        description="Make every decision-maker, champion, and customer conversation easy to find."
        action={
          <>
            {canImport ? (
              <Button asChild variant="outline">
                <Link href="/dashboard/import">
                  <Upload className="mr-2 size-4" aria-hidden="true" />
                  Import CSV
                </Link>
              </Button>
            ) : null}
            {canCreate ? (
              <Button asChild>
                <Link href="/dashboard/customers/contacts/new">
                  <Plus className="mr-2 size-4" aria-hidden="true" />
                  Add contact
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <form className="flex flex-wrap gap-3 rounded-3xl border bg-background p-4 shadow-sm">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
          <Input
            name="search"
            defaultValue={data.search}
            className="pl-9"
            placeholder="Search name, email, phone, role, account"
          />
        </div>
        <Button variant="outline">Search</Button>
        {data.search ? (
          <Button asChild variant="ghost">
            <Link href="/dashboard/customers/contacts">Clear</Link>
          </Button>
        ) : null}
      </form>

      {data.records.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center">
          <h2 className="font-semibold">No contacts found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add a contact to keep the people behind your opportunities connected.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border bg-background shadow-sm">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="border-b bg-muted/30 text-left text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="p-4">Contact</th>
                <th className="p-4">Account</th>
                <th className="p-4">Related CRM</th>
                <th className="p-4">Owner</th>
                <th className="p-4">Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.records.map((record) => (
                <tr key={record.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-4">
                    <Link
                      href={`/dashboard/customers/contacts/${record.id}`}
                      className="font-semibold hover:text-primary"
                    >
                      {record.fullName}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {record.title ?? record.email ?? record.phone ?? "No contact details"}
                    </p>
                  </td>
                  <td className="p-4">
                    {record.accountId && record.accountName ? (
                      <Link
                        className="hover:text-primary"
                        href={`/dashboard/customers/accounts/${record.accountId}`}
                      >
                        {record.accountName}
                        {record.isPrimary ? " · Primary" : ""}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {record.leadCount} leads · {record.dealCount} deals
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {record.assignedOwnerUserId ?? "Unassigned"}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {record.updatedAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
