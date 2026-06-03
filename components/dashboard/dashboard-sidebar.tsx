"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListChecks, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { LeadFlowLogo } from "@/components/brand/lead-flow-logo";
import { dashboardNavItems } from "@/components/dashboard/dashboard-nav";
import { cn } from "@/lib/utils";

type DashboardSidebarProps = {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

function isActivePath(
  pathname: string,
  href: string,
  exact?: boolean,
) {
  if (exact) return pathname === href;
  if (href === "/dashboard") return pathname === href;
  if (href === "/dashboard/leads") {
    return (
      pathname === href ||
      (pathname.startsWith("/dashboard/leads/") &&
        pathname !== "/dashboard/leads/new")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({
  collapsed = false,
  onClose,
  onToggleCollapsed,
}: {
  collapsed?: boolean;
  onClose?: () => void;
  onToggleCollapsed?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          "flex h-16 items-center border-b transition-[padding] duration-200",
          collapsed ? "justify-between gap-1 px-2" : "gap-3 px-5",
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex min-w-0 items-center transition-all",
            collapsed ? "justify-center" : "gap-3",
          )}
          onClick={onClose}
          aria-label="LeadFlow dashboard"
          title={collapsed ? "LeadFlow dashboard" : undefined}
        >
          <LeadFlowLogo
            showWordmark={!collapsed}
            subtitle="Lead management"
            className={collapsed ? "gap-0" : undefined}
            wordmarkClassName="text-foreground"
          />
        </Link>

        {onToggleCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-3 py-5"
      >
        <nav className="space-y-1">
          {dashboardNavItems.map((item) => {
            const active = isActivePath(pathname, item.href, item.exact);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                title={collapsed ? item.title : undefined}
                aria-label={collapsed ? item.title : undefined}
                className={cn(
                  "group flex items-center rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  collapsed
                    ? "h-11 justify-center px-0"
                    : "gap-3 px-3 py-2.5",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : cn(
                        "text-muted-foreground hover:bg-muted hover:text-foreground",
                        !collapsed && "hover:translate-x-0.5",
                      ),
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
                <span className={cn(collapsed ? "sr-only" : "truncate")}>
                  {item.title}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div
        className={cn(
          "shrink-0 border-t py-4 transition-[padding] duration-200",
          collapsed ? "px-3" : "px-4",
        )}
      >
        <div
          className={cn(
            "rounded-2xl border bg-gradient-to-br from-muted/55 via-muted/35 to-background transition-all duration-200",
            collapsed
              ? "flex h-11 items-center justify-center px-0"
              : "p-4",
          )}
          title={collapsed ? "Stay organized" : undefined}
        >
          {collapsed ? (
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          ) : (
            <>
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Stay organized
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Track every lead from first contact to close.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardSidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapsed,
}: DashboardSidebarProps) {
  return (
    <>
      <aside
        className={cn(
          "hidden h-dvh shrink-0 border-r bg-background/95 backdrop-blur transition-[width] duration-300 ease-in-out lg:block",
          collapsed ? "w-[5.5rem]" : "w-72",
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapsed={onToggleCollapsed}
        />
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
