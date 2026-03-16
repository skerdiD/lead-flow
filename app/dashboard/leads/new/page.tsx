import { LeadForm } from "@/components/leads/lead-form";
import { PageHeader } from "@/components/dashboard/page-header";

export default function NewLeadPage() {
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