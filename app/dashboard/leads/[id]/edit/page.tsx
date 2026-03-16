import { notFound } from "next/navigation";
import { getLeadDetails } from "@/app/dashboard/leads/[id]/queries";
import { PageHeader } from "@/components/dashboard/page-header";
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
      <PageHeader
        eyebrow="Lead management"
        title="Edit lead"
        description={`Update the latest information for ${lead.fullName}.`}
      />

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