import { Database, FileClock, LockKeyhole, ShieldCheck, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { TeamMembersSection } from "@/components/settings/team-members-section";
import { Button } from "@/components/ui/button";
import { hasWorkspacePermission, workspaceRoleLabels } from "@/lib/authorization";
import { requireCurrentUser } from "@/lib/auth";
import { isDemoWorkspace } from "@/lib/demo";
import { getWorkspaceTeam } from "@/lib/workspace-team";
import { getCurrentWorkspace } from "@/lib/workspaces";

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
  id,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-3xl border bg-background p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-muted/40">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="mt-6">{children}</div>
        </div>
      </div>
    </section>
  );
}

function SettingRow({
  label,
  value,
  hint,
  action,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <div className="text-sm text-muted-foreground">{value}</div>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export default async function SettingsPage() {
  const [{ userId, user }, workspace] = await Promise.all([
    requireCurrentUser(),
    getCurrentWorkspace(),
  ]);
  const userRecord = user as Record<string, unknown>;
  const firstName =
    typeof userRecord.firstName === "string" ? userRecord.firstName : "";
  const lastName =
    typeof userRecord.lastName === "string" ? userRecord.lastName : "";
  const username =
    typeof userRecord.username === "string" ? userRecord.username : "";
  const primaryEmailAddress =
    typeof userRecord.primaryEmailAddress === "object" &&
    userRecord.primaryEmailAddress !== null &&
    "emailAddress" in userRecord.primaryEmailAddress &&
    typeof userRecord.primaryEmailAddress.emailAddress === "string"
      ? userRecord.primaryEmailAddress.emailAddress
      : "";

  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    username ||
    "LeadFlow user";

  const primaryEmail = primaryEmailAddress || "No email available";
  const canViewMembers = hasWorkspacePermission(workspace.role, "members:view");
  const canImport = hasWorkspacePermission(workspace.role, "crm:import");
  const canViewWorkspaceActivity = hasWorkspacePermission(workspace.role, "analytics:view");
  const canManageWorkspace = hasWorkspacePermission(workspace.role, "workspace:manage");
  const canViewAllCrm = hasWorkspacePermission(workspace.role, "crm:view_all");
  const members = canViewMembers ? await getWorkspaceTeam(workspace) : [];
  const demoWorkspace = isDemoWorkspace(workspace);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace settings"
        title="Settings"
        description={
          demoWorkspace
            ? "Review how workspace controls are organized in the shared demo."
            : "Manage your account and workspace settings."
        }
      />

      {demoWorkspace ? (
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 px-4 py-3 text-sm leading-6 text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/35 dark:text-cyan-100">
          This shared demo workspace is read-only. Team changes, ownership transfer, and workspace deletion are disabled.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="space-y-6">
          <SettingsSection
            icon={UserCircle2}
            title="Account"
            description="Your profile and sign-in details."
            id="profile"
          >
            <div className="space-y-4">
              <SettingRow
                label="Full name"
                value={fullName}
                hint="Used for your account identity in the app."
              />
              <SettingRow
                label="Email address"
                value={primaryEmail}
                hint="Managed by your authentication provider."
              />
              <SettingRow
                label="User ID"
                value={
                  <span className="break-all font-mono text-xs text-muted-foreground">
                    {userId ?? "Unavailable"}
                  </span>
                }
                hint="Internal workspace ownership reference."
              />
            </div>
          </SettingsSection>

          {canImport ? (
            <SettingsSection
              icon={Database}
              title="Data & imports"
              description="Bring workspace CRM data into LeadFlow and review prior imports."
            >
              <SettingRow
                label="CSV data management"
                value={demoWorkspace ? "Import tools are view-only in the shared demo." : "Import leads, accounts, and contacts through a staged review workflow."}
                hint="Import history includes processing outcomes and rejected-row details."
                action={<Button asChild variant="outline"><Link href="/dashboard/settings/imports">Open data & imports</Link></Button>}
              />
            </SettingsSection>
          ) : null}

          {canViewWorkspaceActivity ? (
            <SettingsSection
              icon={FileClock}
              title="Workspace activity"
              description="Review recent CRM changes you are permitted to see."
            >
              <SettingRow
                label="Activity history"
                value={canViewAllCrm ? "Workspace-wide CRM activity" : "Activity for CRM records assigned to you"}
                hint="Sensitive administrative events remain in the separate audit log."
                action={<Button asChild variant="outline"><Link href="/dashboard/settings/activity">View activity</Link></Button>}
              />
            </SettingsSection>
          ) : null}
        </div>

        <div className="space-y-6">
          <SettingsSection
            icon={ShieldCheck}
            title="Workspace and data"
            description="Your workspace and data access."
            id="access-security"
          >
            <div className="space-y-4">
              <SettingRow
                label="Current workspace"
                value={workspace.name}
                hint={`Your role in this workspace is ${workspaceRoleLabels[workspace.role]}.`}
              />
              <SettingRow
                label="Data ownership"
                value="Workspace-scoped CRM records"
                hint="Leads, notes, and activity are isolated by workspace membership."
              />
              {canManageWorkspace ? (
                <SettingRow
                  label="Audit log"
                  value="Structured records for sensitive workspace and CRM changes."
                  hint="Available to Workspace Owners and Admins."
                  action={<Button asChild variant="outline"><Link href="/dashboard/settings/audit-log">View audit log</Link></Button>}
                />
              ) : null}
            </div>
          </SettingsSection>

          <SettingsSection
            icon={LockKeyhole}
            title="Security"
            description="How your account and workspace are protected."
          >
            <div className="space-y-4">
              <SettingRow
                label="Authentication"
                value="Protected with Clerk"
                hint="Sign-in, session management, and route protection are active."
              />
              <SettingRow
                label="Lead access control"
                value={
                  canViewAllCrm ? "Workspace CRM access" : "Assigned CRM records"
                }
                hint={
                  canViewAllCrm
                    ? "Your role can manage all CRM records in this workspace."
                    : "You can view and update records assigned to you."
                }
              />
            </div>
          </SettingsSection>
        </div>
      </div>

      {canViewMembers ? (
        <div id="team-roles" className="scroll-mt-24">
          <TeamMembersSection
            workspaceName={workspace.name}
            members={members}
            canInvite={!demoWorkspace && hasWorkspacePermission(workspace.role, "members:manage")}
            canTransferOwnership={!demoWorkspace && hasWorkspacePermission(workspace.role, "ownership:transfer")}
            canDeleteWorkspace={!demoWorkspace && hasWorkspacePermission(workspace.role, "workspace:delete")}
          />
        </div>
      ) : null}
    </div>
  );
}
