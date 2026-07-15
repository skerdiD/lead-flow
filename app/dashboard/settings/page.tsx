import { Bell, LockKeyhole, ShieldCheck, UserCircle2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { requireCurrentUser } from "@/lib/auth";
import { getCurrentWorkspace } from "@/lib/workspaces";

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border bg-background p-6 shadow-sm">
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
    "Account owner";

  const primaryEmail = primaryEmailAddress || "No email available";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace settings"
        title="Settings"
        description="Manage your account and workspace settings."
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="space-y-6">
          <SettingsSection
            icon={UserCircle2}
            title="Account"
            description="Your profile and sign-in details."
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

          <SettingsSection
            icon={Bell}
            title="Notifications"
            description="Notification controls are coming soon."
          >
            <div className="space-y-4">
              <SettingRow
                label="Product notifications"
                value="Notification settings are not available yet."
                hint="This area will include reminders and activity updates."
                action={
                  <Button variant="outline" disabled>
                    Coming soon
                  </Button>
                }
              />
              <SettingRow
                label="Lead activity reminders"
                value="No reminder system is active yet."
                hint="Follow-up reminders and inactivity alerts are planned."
              />
            </div>
          </SettingsSection>
        </div>

        <div className="space-y-6">
          <SettingsSection
            icon={ShieldCheck}
            title="Workspace and data"
            description="Your workspace and data access."
          >
            <div className="space-y-4">
              <SettingRow
                label="Current workspace"
                value={workspace.name}
                hint={`Your role in this workspace is ${workspace.role}.`}
              />
              <SettingRow
                label="Data ownership"
                value="Workspace-scoped CRM records"
                hint="Leads, notes, and activity are isolated by workspace membership."
              />
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
                value="Workspace member access"
                hint="Only workspace members can read or manage CRM records in that workspace."
              />
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
