"use client";

import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";

type DashboardShellProps = {
  children: React.ReactNode;
  searchSlot?: React.ReactNode;
};

export function DashboardShell({
  children,
  searchSlot,
}: DashboardShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/35 via-muted/20 to-background">
      <div className="flex min-h-screen">
        <DashboardSidebar
          open={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <DashboardTopbar
            onOpenSidebar={() => setMobileSidebarOpen(true)}
            searchSlot={searchSlot}
          />

          <main className="flex-1 px-4 py-7 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
