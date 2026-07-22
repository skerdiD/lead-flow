import { notFound, redirect } from "next/navigation";
import { hasWorkspacePermission } from "@/lib/authorization";
import { isDemoWorkspace } from "@/lib/demo";
import { LeadForm } from "@/components/leads/lead-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { getCurrentWorkspace } from "@/lib/workspaces";

export default async function NewLeadPage() {
  const workspace = await getCurrentWorkspace();

  if (!hasWorkspacePermission(workspace.role, "crm:create")) notFound();

  if (isDemoWorkspace(workspace)) {
    redirect("/dashboard/leads");
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Lead management"
        title="Create lead"
        description="Add a lead and record the details you have so far."
      />

      <LeadForm mode="create" />
    </div>
  );
}
