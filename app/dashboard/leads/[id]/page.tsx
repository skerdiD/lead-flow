import { notFound } from "next/navigation";
import { getLeadDetails } from "@/app/dashboard/leads/[id]/queries";
import { LeadDetailsCard } from "@/components/leads/lead-details-card";
import { hasWorkspacePermission } from "@/lib/authorization";
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

  const canUpdate =
    hasWorkspacePermission(workspace.role, "crm:update_all") ||
    hasWorkspacePermission(workspace.role, "crm:update_assigned");

  return (
    <LeadDetailsCard
      lead={lead}
      readOnly={isDemoWorkspace(workspace)}
      canUpdate={canUpdate}
      canManageAllCrm={hasWorkspacePermission(workspace.role, "crm:update_all")}
      canDelete={hasWorkspacePermission(workspace.role, "crm:delete")}
      canAssign={hasWorkspacePermission(workspace.role, "crm:assign")}
    />
  );
}
