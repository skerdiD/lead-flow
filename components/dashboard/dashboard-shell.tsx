"use client";

import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";

type DashboardShellProps = {
  children: React.ReactNode;
  currentWorkspaceName: string;
  searchSlot?: React.ReactNode;
};

export function DashboardShell({
  children,
  currentWorkspaceName,
  searchSlot,
}: DashboardShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="h-dvh overflow-hidden bg-gradient-to-b from-muted/35 via-muted/20 to-background">
      <div className="flex h-full min-h-0">
        <DashboardSidebar
          open={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
          <DashboardTopbar
            onOpenSidebar={() => setMobileSidebarOpen(true)}
            currentWorkspaceName={currentWorkspaceName}
            searchSlot={searchSlot}
          />

          <main className="flex min-h-0 flex-1 overflow-hidden px-4 py-7 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-1 flex-col">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
