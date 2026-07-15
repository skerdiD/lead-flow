import { notFound } from "next/navigation";
import { getLeadDetails } from "@/app/dashboard/leads/[id]/queries";
import { LeadDetailsCard } from "@/components/leads/lead-details-card";
import { isDemoWorkspace } from "@/lib/demo";
import { getCurrentWorkspace } from "@/lib/workspaces";

type LeadPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function LeadPage({ params }: LeadPageProps) {
  const { id } = await params;
  const [lead, workspace] = await Promise.all([
    getLeadDetails(id),
    getCurrentWorkspace(),
  ]);

  if (!lead) {
    notFound();
  }

  return <LeadDetailsCard lead={lead} readOnly={isDemoWorkspace(workspace)} />;
}
