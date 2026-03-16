"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

type DashboardTopbarProps = {
  onOpenSidebar: () => void;
  searchSlot?: React.ReactNode;
};

const titleMap: Array<{
  match: (pathname: string) => boolean;
  title: string;
}> = [
  {
    match: (pathname) => pathname === "/dashboard",
    title: "Dashboard",
  },
  {
    match: (pathname) => pathname === "/dashboard/leads",
    title: "Leads",
  },
  {
    match: (pathname) => pathname === "/dashboard/leads/new",
    title: "Add Lead",
  },
  {
    match: (pathname) =>
      /^\/dashboard\/leads\/[^/]+\/edit$/.test(pathname),
    title: "Edit Lead",
  },
  {
    match: (pathname) =>
      /^\/dashboard\/leads\/[^/]+$/.test(pathname),
    title: "Lead Details",
  },
  {
    match: (pathname) => pathname === "/dashboard/settings",
    title: "Settings",
  },
];

function getPageTitle(pathname: string) {
  const entry = titleMap.find((item) => item.match(pathname));
  return entry?.title ?? "Dashboard";
}

export function DashboardTopbar({
  onOpenSidebar,
  searchSlot,
}: DashboardTopbarProps) {
  const pathname = usePathname();

  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {pageTitle}
          </h1>
        </div>

        {searchSlot ? (
          <div className="hidden min-w-[280px] flex-1 justify-end md:flex">
            <div className="w-full max-w-md">{searchSlot}</div>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-foreground">Account</p>
            <p className="text-xs text-muted-foreground">
              Manage your workspace
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-background">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
          </div>
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