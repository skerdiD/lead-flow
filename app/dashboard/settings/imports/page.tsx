import Link from "next/link";
import { notFound } from "next/navigation";
import { FileClock, Upload } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { hasWorkspacePermission } from "@/lib/authorization";
import { isDemoWorkspace } from "@/lib/demo";
import { getCurrentWorkspace } from "@/lib/workspaces";

export default async function DataImportsPage() {
  const workspace = await getCurrentWorkspace();
  if (!hasWorkspacePermission(workspace.role, "crm:import")) notFound();

  const demo = isDemoWorkspace(workspace);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace settings"
        title="Data & imports"
        description="Upload CRM data, review it before import, and check previous results."
      />

      {demo ? (
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 px-4 py-3 text-sm leading-6 text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/35 dark:text-cyan-100">
          Import tools are disabled in the shared demo workspace, but the role-based organization is shown here.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-3xl border bg-background p-6 shadow-sm">
          <span className="flex size-11 items-center justify-center rounded-2xl border bg-muted/40 text-muted-foreground">
            <Upload className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-lg font-semibold">Import CSV</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Upload leads, accounts, or contacts, map columns, review rows, and confirm before records are written.
          </p>
          {demo ? (
            <Button className="mt-5" disabled>Start an import</Button>
          ) : (
            <Button asChild className="mt-5">
              <Link href="/dashboard/import">Start an import</Link>
            </Button>
          )}
        </section>

        <section className="rounded-3xl border bg-background p-6 shadow-sm">
          <span className="flex size-11 items-center justify-center rounded-2xl border bg-muted/40 text-muted-foreground">
            <FileClock className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-lg font-semibold">Import history</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Review processing status, imported and rejected row counts, and prior import results.
          </p>
          {demo ? (
            <Button variant="outline" className="mt-5" disabled>View import history</Button>
          ) : (
            <Button asChild variant="outline" className="mt-5">
              <Link href="/dashboard/settings/imports/history">View import history</Link>
            </Button>
          )}
        </section>
      </div>
    </div>
  );
}
