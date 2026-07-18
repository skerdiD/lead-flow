import { notFound, redirect } from "next/navigation";
import { getContactDetails, getCrmSelectors } from "@/app/dashboard/crm-queries";
import { ContactForm } from "@/components/crm/contact-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { isDemoWorkspace } from "@/lib/demo";
import { getCurrentWorkspace } from "@/lib/workspaces";
export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const [data, selectors, workspace] = await Promise.all([getContactDetails(id), getCrmSelectors(), getCurrentWorkspace()]); if (!data) notFound(); if (isDemoWorkspace(workspace)) redirect(`/dashboard/customers/contacts/${id}`); return <div className="mx-auto max-w-4xl space-y-6"><PageHeader eyebrow="Relationship management" title="Edit contact" description={`Update the details for ${data.contact.fullName}.`} /><ContactForm id={id} accounts={selectors.accounts} initialValues={{ fullName: data.contact.fullName, email: data.contact.email ?? undefined, phone: data.contact.phone ?? undefined, title: data.contact.title ?? undefined, accountId: data.contact.accountId ?? undefined, assignedOwnerUserId: data.contact.assignedOwnerUserId ?? undefined, isPrimary: data.contact.isPrimary }} /></div>; }
