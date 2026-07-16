import Link from "next/link";
import { History } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ImportUnavailable, ImportWizard } from "@/components/imports/import-wizard";
import { Button } from "@/components/ui/button";
import { hasWorkspacePermission } from "@/lib/authorization";
import { isDemoWorkspace } from "@/lib/demo";
import { IMPORT_LIMITS } from "@/lib/imports/config";
import { getCurrentWorkspace } from "@/lib/workspaces";

export default async function ImportPage() {
  const workspace = await getCurrentWorkspace();
  const canImport = hasWorkspacePermission(workspace.role, "crm:import");
  const demo = isDemoWorkspace(workspace);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Data management"
        title="Import CSV"
        description="Bring leads, contacts, and accounts into LeadFlow through a reviewed, workspace-safe workflow."
        action={
          canImport && !demo ? (
            <Button asChild variant="outline">
              <Link href="/dashboard/import/history">
                <History className="mr-2 h-4 w-4" />
                Import history
              </Link>
            </Button>
          ) : undefined
        }
      />
      {canImport && !demo ? <ImportWizard /> : <ImportUnavailable demo={demo} />}
      {canImport && !demo ? (
        <p className="text-xs leading-5 text-muted-foreground">
          Staged row data is retained for {IMPORT_LIMITS.stagedDataRetentionDays} days to support review and rejected-row downloads. Import history and aggregate audit metadata remain available without the raw CSV file.
        </p>
      ) : null}
    </div>
  );
}
