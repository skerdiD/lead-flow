import { notFound } from "next/navigation";
import { getLeadDetails } from "@/app/dashboard/leads/[id]/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { LeadForm } from "@/components/leads/lead-form";
import { DEAL_CURRENCIES, type DealCurrency } from "@/lib/constants/crm";

type EditLeadPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeDealCurrency(currency?: string | null): DealCurrency {
  return DEAL_CURRENCIES.includes(currency as DealCurrency)
    ? (currency as DealCurrency)
    : "USD";
}

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
          nextFollowUpDate: lead.nextFollowUpDate
            ? lead.nextFollowUpDate.toISOString().slice(0, 10)
            : undefined,
          followUpNote: lead.followUpNote ?? undefined,
          followUpPriority: lead.followUpPriority,
          followUpStatus: lead.followUpStatus,
          dealName: lead.dealEntry?.name ?? undefined,
          dealStage: lead.dealEntry?.stage ?? "new",
          dealValue: lead.dealEntry ? lead.dealEntry.valueCents / 100 : 0,
          dealCurrency: normalizeDealCurrency(lead.dealEntry?.currency),
          dealProbability: lead.dealEntry?.probability ?? 10,
          expectedCloseDate: lead.dealEntry?.expectedCloseAt
            ? lead.dealEntry.expectedCloseAt.toISOString().slice(0, 10)
            : undefined,
          closedDate: lead.dealEntry?.closedAt
            ? lead.dealEntry.closedAt.toISOString().slice(0, 10)
            : undefined,
          lostReason: lead.dealEntry?.lostReason ?? undefined,
        }}
      />
    </div>
  );
}
