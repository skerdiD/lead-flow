import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  hasWorkspacePermission,
  workspacePermissions,
  workspaceRoleLabels,
} from "@/lib/authorization";
import { isDemoWorkspace } from "@/lib/demo";
import { getCurrentWorkspace } from "@/lib/workspaces";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const workspace = await getCurrentWorkspace();

  return (
    <>
      <DashboardShell
        currentWorkspaceName={workspace.name}
        isDemoWorkspace={isDemoWorkspace(workspace)}
        navigationContext={{
          permissions: workspacePermissions.filter((permission) =>
            hasWorkspacePermission(workspace.role, permission),
          ),
          isDemoWorkspace: isDemoWorkspace(workspace),
        }}
        roleLabel={workspaceRoleLabels[workspace.role]}
      >
        {children}
      </DashboardShell>
      <Toaster richColors position="top-right" closeButton />
    </>
  );
}
