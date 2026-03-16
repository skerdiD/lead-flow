import { LeadForm } from "@/components/leads/lead-form";

export default function NewLeadPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">Lead management</p>
        <h1 className="text-3xl font-semibold tracking-tight">Create lead</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Add a new lead to your workspace and keep your pipeline organized from
          the first touchpoint.
        </p>
      </div>

      <LeadForm />
    </div>
  );
}