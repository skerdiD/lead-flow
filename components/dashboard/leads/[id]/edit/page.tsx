import { notFound } from "next/navigation";
import { getLeadDetails } from "@/app/dashboard/leads/[id]/queries";
import { LeadForm } from "@/components/leads/lead-form";

type EditLeadPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditLeadPage({
  params,
}: EditLeadPageProps) {
  const { id } = await params;
  const lead = await getLeadDetails(id);

  if (!lead) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">Lead management</p>
        <h1 className="text-3xl font-semibold tracking-tight">Edit lead</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Update the latest information for {lead.fullName}.
        </p>
      </div>

      <LeadForm
        mode="edit"
        leadId={lead.id}
        initialValues={{
          fullName: lead.fullName,
          company: lead.company ?? undefined,
          email: lead.email ?? undefined,
          phone: lead.phone ?? undefined,
          status: lead.status,
          source: lead.source ?? undefined,
          notes: lead.notes ?? undefined,
        }}
      />
    </div>
  );
}