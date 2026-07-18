import type { ReactNode } from "react";
import { getSettingsNavigationForUser } from "@/components/dashboard/dashboard-nav";
import { SettingsNavigation } from "@/components/settings/settings-navigation";
import { hasWorkspacePermission, workspacePermissions } from "@/lib/authorization";
import { isDemoWorkspace } from "@/lib/demo";
import { getCurrentWorkspace } from "@/lib/workspaces";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const workspace = await getCurrentWorkspace();
  const items = getSettingsNavigationForUser({
    permissions: workspacePermissions.filter((permission) =>
      hasWorkspacePermission(workspace.role, permission),
    ),
    isDemoWorkspace: isDemoWorkspace(workspace),
  });

  return (
    <div className="space-y-6">
      <SettingsNavigation items={items} />
      {children}
    </div>
  );
}
