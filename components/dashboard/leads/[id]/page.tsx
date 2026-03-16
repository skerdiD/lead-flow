import { notFound } from "next/navigation";
import { getLeadDetails } from "@/app/dashboard/leads/[id]/queries";
import { LeadDetailsCard } from "@/components/leads/lead-details-card";

type LeadDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function LeadDetailsPage({
  params,
}: LeadDetailsPageProps) {
  const { id } = await params;
  const lead = await getLeadDetails(id);

  if (!lead) {
    notFound();
  }

  return <LeadDetailsCard lead={lead} />;
}