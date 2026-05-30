import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
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
      <DashboardShell currentWorkspaceName={workspace.name}>
        {children}
      </DashboardShell>
      <Toaster richColors position="top-right" closeButton />
    </>
  );
}
