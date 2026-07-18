import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { ImportUnavailable } from "@/components/imports/import-wizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasWorkspacePermission } from "@/lib/authorization";
import { isDemoWorkspace } from "@/lib/demo";
import { getImportJobDetails } from "@/lib/imports/server";
import { getCurrentWorkspace } from "@/lib/workspaces";

export default async function ImportResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const workspace = await getCurrentWorkspace();
  if (!hasWorkspacePermission(workspace.role, "crm:import")) notFound();
  if (isDemoWorkspace(workspace)) return <ImportUnavailable demo />;
  const { id } = await params;
  const details = await getImportJobDetails(id);
  const job = details.job;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Import results"
        title={job.originalFileName}
        description={`Review the ${job.entityType} import outcome and any rejected rows.`}
        action={<Button asChild variant="outline"><Link href="/dashboard/settings/imports/history"><ArrowLeft className="mr-2 h-4 w-4" />Import history</Link></Button>}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[["Status", job.status], ["Imported", job.importedRows], ["Updated", job.updatedRows], ["Skipped", job.skippedRows], ["Failed", job.failedRows]].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border bg-background p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{label}</p>
            {label === "Status" ? <Badge variant="outline" className="mt-2 capitalize">{value}</Badge> : <p className="mt-1 text-3xl font-semibold">{value}</p>}
          </div>
        ))}
      </div>
      <section className="rounded-3xl border bg-background p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Validation summary</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {job.totalRows} total rows · {job.validRows} valid · {job.duplicateRows} duplicates · {job.invalidRows} invalid
        </p>
        {job.invalidRows > 0 || job.failedRows > 0 ? (
          <Button asChild variant="outline" className="mt-5">
            <a href={`/api/imports/${job.id}/rejected`}><Download className="mr-2 h-4 w-4" />Download rejected rows</a>
          </Button>
        ) : null}
      </section>
    </div>
  );
}
