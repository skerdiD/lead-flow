import { notFound, redirect } from "next/navigation";
import { getAccountDetails } from "@/app/dashboard/crm-queries";
import { AccountForm } from "@/components/crm/account-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { isDemoWorkspace } from "@/lib/demo";
import { getCurrentWorkspace } from "@/lib/workspaces";
export default async function EditAccountPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const [data, workspace] = await Promise.all([getAccountDetails(id), getCurrentWorkspace()]); if (!data) notFound(); if (isDemoWorkspace(workspace)) redirect(`/dashboard/accounts/${id}`); return <div className="mx-auto max-w-4xl space-y-6"><PageHeader eyebrow="Relationship management" title="Edit account" description={`Update the details for ${data.account.name}.`} /><AccountForm id={id} initialValues={{ name: data.account.name, website: data.account.website ?? undefined, industry: data.account.industry ?? undefined, assignedOwnerUserId: data.account.assignedOwnerUserId ?? undefined }} /></div>; }
