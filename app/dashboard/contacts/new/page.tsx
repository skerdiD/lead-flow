import { notFound, redirect } from "next/navigation";
import { getCrmSelectors } from "@/app/dashboard/crm-queries";
import { ContactForm } from "@/components/crm/contact-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { hasWorkspacePermission } from "@/lib/authorization";
import { isDemoWorkspace } from "@/lib/demo";
import { getCurrentWorkspace } from "@/lib/workspaces";
export default async function NewContactPage({ searchParams }: { searchParams: Promise<{ account?: string }> }) { const [workspace, selectors, params] = await Promise.all([getCurrentWorkspace(), getCrmSelectors(), searchParams]); if (!hasWorkspacePermission(workspace.role, "crm:create")) notFound(); if (isDemoWorkspace(workspace)) redirect("/dashboard/customers/contacts"); return <div className="mx-auto max-w-4xl space-y-6"><PageHeader eyebrow="Relationship management" title="Create contact" description="Capture the person behind the next customer conversation." /><ContactForm accounts={selectors.accounts} initialValues={{ accountId: params.account }} /></div>; }
