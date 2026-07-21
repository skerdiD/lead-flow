import Link from "next/link";
import { notFound } from "next/navigation";
import { getDealDetails } from "@/app/dashboard/deals/queries";
import { DeleteDealDialog } from "@/components/deals/delete-deal-dialog";
import { DetailSection } from "@/components/crm/detail-section";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { hasWorkspacePermission } from "@/lib/authorization";
import { DEAL_STAGE_LABELS } from "@/lib/constants/crm";
import { formatCurrencyFromCents } from "@/lib/revenue";
import { getCurrentWorkspace } from "@/lib/workspaces";

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [deal, workspace] = await Promise.all([getDealDetails(id), getCurrentWorkspace()]);
  if (!deal) notFound();
  return <div className="space-y-5">
    <PageHeader eyebrow="Revenue pipeline" title={deal.name} description={`${DEAL_STAGE_LABELS[deal.stage]} opportunity · ${deal.probability}% probability`}
      action={hasWorkspacePermission(workspace.role, "crm:delete") ? <DeleteDealDialog dealId={deal.id} dealName={deal.name} /> : undefined} />
    <div className="grid gap-5 md:grid-cols-2">
      <DetailSection title="Deal overview"><dl className="space-y-3 text-sm"><div><dt className="text-muted-foreground">Stage</dt><dd><Badge>{DEAL_STAGE_LABELS[deal.stage]}</Badge></dd></div><div><dt className="text-muted-foreground">Value</dt><dd className="font-semibold">{formatCurrencyFromCents(deal.valueCents, deal.currency)}</dd></div><div><dt className="text-muted-foreground">Expected close</dt><dd>{deal.expectedCloseAt?.toLocaleDateString() ?? "Not set"}</dd></div><div><dt className="text-muted-foreground">Lost reason</dt><dd>{deal.lostReason ?? "—"}</dd></div></dl></DetailSection>
      <DetailSection title="Connected records"><dl className="space-y-3 text-sm"><div><dt className="text-muted-foreground">Account</dt><dd>{deal.accountId && deal.accountName ? <Link className="text-primary" href={`/dashboard/customers/accounts/${deal.accountId}`}>{deal.accountName}</Link> : "—"}</dd></div><div><dt className="text-muted-foreground">Contact</dt><dd>{deal.contactId && deal.contactName ? <Link className="text-primary" href={`/dashboard/customers/contacts/${deal.contactId}`}>{deal.contactName}</Link> : "—"}</dd></div><div><dt className="text-muted-foreground">Lead</dt><dd>{deal.leadId && deal.leadName ? <Link className="text-primary" href={`/dashboard/leads/${deal.leadId}`}>{deal.leadName}</Link> : "—"}</dd></div><div><dt className="text-muted-foreground">Owner</dt><dd>{deal.owner?.name ?? "Unassigned"}</dd></div></dl></DetailSection>
    </div>
  </div>;
}
