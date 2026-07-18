import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  hasWorkspacePermission,
  workspacePermissions,
  workspaceRoleLabels,
} from "@/lib/authorization";
import { isDemoWorkspace } from "@/lib/demo";
import { getNotificationDropdownData } from "@/lib/notifications";
import { getCurrentWorkspace } from "@/lib/workspaces";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const [workspace, notificationData] = await Promise.all([
    getCurrentWorkspace(),
    getNotificationDropdownData(),
  ]);

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
        initialNotifications={notificationData.notifications}
        initialUnreadNotificationCount={notificationData.unreadCount}
        notificationReferenceTime={notificationData.referenceTime}
      >
        {children}
      </DashboardShell>
      <Toaster richColors position="top-right" closeButton />
    </>
  );
}
