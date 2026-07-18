import { notFound, redirect } from "next/navigation";
import { AccountForm } from "@/components/crm/account-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { hasWorkspacePermission } from "@/lib/authorization";
import { isDemoWorkspace } from "@/lib/demo";
import { getCurrentWorkspace } from "@/lib/workspaces";
export default async function NewAccountPage() { const workspace = await getCurrentWorkspace(); if (!hasWorkspacePermission(workspace.role, "crm:create")) notFound(); if (isDemoWorkspace(workspace)) redirect("/dashboard/customers/accounts"); return <div className="mx-auto max-w-4xl space-y-6"><PageHeader eyebrow="Relationship management" title="Create account" description="Add the company first, then connect its people and opportunities." /><AccountForm /></div>; }
