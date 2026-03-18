"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

type DashboardTopbarProps = {
  onOpenSidebar: () => void;
  searchSlot?: React.ReactNode;
};

const pageMetaMap: Array<{
  match: (pathname: string) => boolean;
  title: string;
  description: string;
}> = [
  {
    match: (pathname) => pathname === "/dashboard",
    title: "Dashboard",
    description: "Overview of your pipeline performance",
  },
  {
    match: (pathname) => pathname === "/dashboard/leads",
    title: "Leads",
    description: "Track, filter, and manage your opportunities",
  },
  {
    match: (pathname) => pathname === "/dashboard/leads/new",
    title: "Create Lead",
    description: "Capture a new opportunity in your workspace",
  },
  {
    match: (pathname) => pathname === "/dashboard/activity",
    title: "Activity",
    description: "Recent lead actions across your workspace",
  },
  {
    match: (pathname) =>
      /^\/dashboard\/leads\/[^/]+\/edit$/.test(pathname),
    title: "Edit Lead",
    description: "Update lead details and status",
  },
  {
    match: (pathname) =>
      /^\/dashboard\/leads\/[^/]+$/.test(pathname),
    title: "Lead Details",
    description: "Review the full lead profile",
  },
  {
    match: (pathname) => pathname === "/dashboard/settings",
    title: "Settings",
    description: "Account, workspace, and security preferences",
  },
];

function getPageMeta(pathname: string) {
  const entry = pageMetaMap.find((item) => item.match(pathname));
  return (
    entry ?? {
      title: "Dashboard",
      description: "Lead management workspace",
    }
  );
}

export function DashboardTopbar({
  onOpenSidebar,
  searchSlot,
}: DashboardTopbarProps) {
  const pathname = usePathname();
  const page = getPageMeta(pathname);
  const onCreatePage = pathname === "/dashboard/leads/new";

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
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
          {!onCreatePage ? (
            <Link
              href="/dashboard/leads/new"
              className="hidden items-center rounded-xl border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted md:inline-flex"
            >
              <Plus className="mr-2 h-4 w-4" />
              New lead
            </Link>
          ) : null}

          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-9 w-9 ring-1 ring-border",
              },
            }}
          />
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
