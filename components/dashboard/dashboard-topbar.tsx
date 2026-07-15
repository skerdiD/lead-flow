"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Menu, Plus } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { getDashboardRouteMeta } from "@/components/dashboard/dashboard-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Badge } from "@/components/ui/badge";
import type { NotificationListItem } from "@/lib/notifications-types";

type DashboardTopbarProps = {
  onOpenSidebar: () => void;
  currentWorkspaceName: string;
  isDemoWorkspace?: boolean;
  searchSlot?: React.ReactNode;
  initialNotifications: NotificationListItem[];
  initialUnreadNotificationCount: number;
  notificationReferenceTime: number;
};

export function DashboardTopbar({
  onOpenSidebar,
  currentWorkspaceName,
  isDemoWorkspace = false,
  searchSlot,
  initialNotifications,
  initialUnreadNotificationCount,
  notificationReferenceTime,
}: DashboardTopbarProps) {
  const isE2ETestMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE === "1";
  const pathname = usePathname();
  const page = getDashboardRouteMeta(pathname);
  const onCreatePage = pathname === "/dashboard/leads/new";

  return (
    <header className="z-30 shrink-0 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex min-h-[4.25rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
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

        <div className="flex items-center gap-3">
          <div className="hidden max-w-[240px] items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm text-muted-foreground shadow-sm sm:flex">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate font-medium text-foreground">
              {currentWorkspaceName}
            </span>
            {isDemoWorkspace ? (
              <Badge variant="outline" className="shrink-0 bg-muted/40">
                Demo
              </Badge>
            ) : null}
          </div>

          {!onCreatePage && !isDemoWorkspace ? (
            <Link
              href="/dashboard/leads/new"
              className="hidden items-center rounded-xl border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted md:inline-flex"
            >
              <Plus className="mr-2 h-4 w-4" />
              New lead
            </Link>
          ) : null}

          <NotificationBell
            initialNotifications={initialNotifications}
            initialUnreadCount={initialUnreadNotificationCount}
            referenceTime={notificationReferenceTime}
          />

          {isE2ETestMode ? (
            <div
              className="h-9 w-9 rounded-full border bg-muted/40"
              aria-label="Test user avatar"
            />
          ) : (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9 ring-1 ring-border",
                },
              }}
            />
          )}
        </div>
      </div>

      {searchSlot ? (
        <div className="border-t px-4 py-3 md:hidden sm:px-6">
          {searchSlot}
        </div>
      ) : null}
    </header>
  );
}
