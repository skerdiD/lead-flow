"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { dashboardNavItems } from "@/components/dashboard/dashboard-nav";
import { cn } from "@/lib/utils";

type DashboardSidebarProps = {
  open: boolean;
  onClose: () => void;
};

function isActivePath(
  pathname: string,
  href: string,
  exact?: boolean,
) {
  if (exact) return pathname === href;
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b px-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
          onClick={onClose}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
            LF
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              LeadFlow
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Lead management
            </p>
          </div>
        </Link>
      </div>

      <div className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {dashboardNavItems.map((item) => {
            const active = isActivePath(pathname, item.href, item.exact);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    active
                      ? "text-primary-foreground"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t px-4 py-4">
        <div className="rounded-2xl border bg-muted/40 p-4">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            Stay organized
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Track every lead from first contact to close.
          </p>
        </div>
      </div>
    </div>
  );
}

export function DashboardSidebar({
  open,
  onClose,
}: DashboardSidebarProps) {
  return (
    <>
      <aside className="hidden h-screen w-72 shrink-0 border-r bg-background lg:block">
        <SidebarContent />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r bg-background shadow-xl transition-transform duration-200 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-end border-b px-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="h-[calc(100vh-4rem)]">
          <SidebarContent onClose={onClose} />
        </div>
      </aside>
    </>
  );
}