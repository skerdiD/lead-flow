import { redirect } from "next/navigation";
import { isDemoWorkspace } from "@/lib/demo";
import { LeadForm } from "@/components/leads/lead-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { getCurrentWorkspace } from "@/lib/workspaces";

export default async function NewLeadPage() {
  const workspace = await getCurrentWorkspace();

  if (isDemoWorkspace(workspace)) {
    redirect("/dashboard/leads");
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Lead management"
        title="Create lead"
        description="Add a new lead to your workspace and keep your pipeline organized from the first touchpoint."
      />

      <LeadForm mode="create" />
    </div>
  );
}
