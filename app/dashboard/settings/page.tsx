import { Bell, CreditCard, LockKeyhole, ShieldCheck, UserCircle2 } from "lucide-react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";

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
  const { userId } = await auth();
  const user = await currentUser();

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "Account owner";

  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress || "No email available";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace settings"
        title="Settings"
        description="Manage your account, workspace preferences, and the core settings that shape how LeadFlow feels day to day."
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="space-y-6">
          <SettingsSection
            icon={UserCircle2}
            title="Account"
            description="Your signed-in identity and primary profile details."
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
            description="A simple notification structure for a clean version 1 experience."
          >
            <div className="space-y-4">
              <SettingRow
                label="Product notifications"
                value="Notifications are not configurable yet in version 1."
                hint="This space is intentionally prepared for future reminder and activity features."
                action={
                  <Button variant="outline" disabled>
                    Coming soon
                  </Button>
                }
              />
              <SettingRow
                label="Lead activity reminders"
                value="No reminder system is active yet."
                hint="Future versions can add follow-up reminders and inactivity alerts."
              />
            </div>
          </SettingsSection>
        </div>

        <div className="space-y-6">
          <SettingsSection
            icon={CreditCard}
            title="Plan and billing"
            description="A realistic billing section placeholder so the product feels complete."
          >
            <div className="space-y-4">
              <SettingRow
                label="Current plan"
                value="Starter plan"
                hint="LeadFlow version 1 does not include live billing yet."
              />
              <SettingRow
                label="Usage"
                value="Lead tracking, statuses, notes, search, and filtering"
                hint="A solid product foundation for a small SaaS workflow."
              />
            </div>
          </SettingsSection>

          <SettingsSection
            icon={ShieldCheck}
            title="Workspace and data"
            description="Core workspace information and how your leads are isolated."
          >
            <div className="space-y-4">
              <SettingRow
                label="Workspace scope"
                value="Personal workspace"
                hint="Each lead is isolated by the authenticated user account."
              />
              <SettingRow
                label="Data ownership"
                value="All lead records are scoped to your user ID."
                hint="This keeps access control strict and prevents cross-user data access."
              />
            </div>
          </SettingsSection>

          <SettingsSection
            icon={LockKeyhole}
            title="Security"
            description="A lightweight but intentional security section for version 1."
          >
            <div className="space-y-4">
              <SettingRow
                label="Authentication"
                value="Protected with Clerk"
                hint="Sign-in, session management, and route protection are active."
              />
              <SettingRow
                label="Lead access control"
                value="Owner-only access"
                hint="Users can only view, edit, or delete their own leads."
              />
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}