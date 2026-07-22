import { notFound, redirect } from "next/navigation";
import { getCrmSelectors } from "@/app/dashboard/crm-queries";
import { DealForm } from "@/components/deals/deal-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { hasWorkspacePermission } from "@/lib/authorization";
import { isDemoWorkspace } from "@/lib/demo";
import { getCurrentWorkspace } from "@/lib/workspaces";
export default async function NewDealPage() { const [workspace, selectors] = await Promise.all([getCurrentWorkspace(), getCrmSelectors()]); if (!hasWorkspacePermission(workspace.role, "crm:create")) notFound(); if (isDemoWorkspace(workspace)) redirect("/dashboard/deals"); return <div className="mx-auto max-w-4xl space-y-6"><PageHeader eyebrow="Revenue pipeline" title="Create deal" description="Add an opportunity and connect the relevant people and company." /><DealForm selectors={selectors} /></div>; }
