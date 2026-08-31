"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  getDashboardRouteMeta,
  type CreateAction,
} from "@/components/dashboard/dashboard-nav";
import { AccountMenu } from "@/components/dashboard/account-menu";
import { GlobalCreateMenu } from "@/components/dashboard/global-create-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher";

type DashboardTopbarProps = {
  onOpenSidebar: () => void;
  menuTriggerRef?: React.Ref<HTMLButtonElement>;
  currentWorkspaceName: string;
  currentWorkspaceId: string;
  workspaces: Array<{ id: string; name: string }>;
  isDemoWorkspace?: boolean;
  createActions: readonly CreateAction[];
  searchSlot?: React.ReactNode;
};

export function DashboardTopbar({
  onOpenSidebar,
  menuTriggerRef,
  currentWorkspaceName,
  currentWorkspaceId,
  workspaces,
  isDemoWorkspace = false,
  createActions,
  searchSlot,
}: DashboardTopbarProps) {
  const isE2ETestMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE === "1";
  const pathname = usePathname();
  const page = getDashboardRouteMeta(pathname);

  return (
    <header className="z-30 shrink-0 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6 lg:px-7">
        <button
          ref={menuTriggerRef}
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1 font-sans">
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {page.title}
          </h1>
          <p className="hidden truncate pt-0.5 text-xs text-muted-foreground sm:block">
            {page.description}
          </p>
        </div>

        {searchSlot ? (
          <div className="hidden min-w-[280px] flex-1 justify-end md:flex">
            <div className="w-full max-w-md">{searchSlot}</div>
          </div>
        ) : null}

        <div className="flex items-center gap-2.5 font-sans">
          <WorkspaceSwitcher currentWorkspaceId={currentWorkspaceId} currentWorkspaceName={currentWorkspaceName} workspaces={workspaces} demo={isDemoWorkspace} />

          {!isDemoWorkspace ? <GlobalCreateMenu actions={createActions} /> : null}

          <NotificationBell />

          {isE2ETestMode ? (
            <div
              className="h-9 w-9 rounded-full border bg-muted/40"
              aria-label="Test user avatar"
            />
          ) : (
            <AccountMenu />
          )}
        </div>
      </div>

      {searchSlot ? (
        <div className="border-t px-4 py-3 font-sans md:hidden sm:px-6">
          {searchSlot}
        </div>
      ) : null}
    </header>
  );
}
