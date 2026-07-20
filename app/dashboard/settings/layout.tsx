import type { ReactNode } from "react";
import { SettingsNavigation } from "@/components/settings/settings-navigation";
import { hasWorkspacePermission, workspacePermissions } from "@/lib/authorization";
import { getCurrentWorkspace } from "@/lib/workspaces";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const workspace = await getCurrentWorkspace();
  const permissions = workspacePermissions.filter((permission) =>
    hasWorkspacePermission(workspace.role, permission),
  );

  return (
    <div className="space-y-6">
      <SettingsNavigation permissions={permissions} />
      {children}
    </div>
  );
}
