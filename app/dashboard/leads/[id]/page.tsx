import { notFound } from "next/navigation";
import { getLeadDetails } from "@/app/dashboard/leads/[id]/queries";
import { LeadDetailsCard } from "@/components/leads/lead-details-card";

type LeadPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function LeadPage({ params }: LeadPageProps) {
  const { id } = await params;
  const lead = await getLeadDetails(id);

  if (!lead) {
    notFound();
  }

  return <LeadDetailsCard lead={lead} />;
}
