"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { LeadFlowLogo } from "@/components/brand/lead-flow-logo";
import {
  getPrimaryNavigationForUser,
  getSecondaryNavigationForUser,
  isNavigationItemActive,
  navigationSectionLabels,
  type NavigationContext,
  type NavigationItem,
  type NavigationSection,
} from "@/components/dashboard/dashboard-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type DashboardSidebarProps = {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  navigationContext: NavigationContext;
  roleLabel: string;
};

function NavigationLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavigationItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const router = useRouter();
  const prefetchRoute = () => router.prefetch(item.href);
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      onMouseEnter={prefetchRoute}
      onFocus={prefetchRoute}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-11 items-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
        active
          ? "bg-primary/10 text-primary ring-1 ring-primary/15"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-[1.125rem] shrink-0",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
        )}
        aria-hidden="true"
      />
      <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function SidebarSection({
  label,
  items,
  pathname,
  collapsed,
  onNavigate,
}: {
  label?: string;
  items: readonly NavigationItem[];
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      {label && !collapsed ? (
        <p className="leadflow-label px-2.5 pb-1 pt-2.5 text-muted-foreground/80 uppercase">
          {label}
        </p>
      ) : label ? (
        <div className="mx-auto my-3 h-px w-8 bg-border" aria-hidden="true" />
      ) : null}
      {items.map((item) => (
        <NavigationLink
          key={item.href}
          item={item}
          active={isNavigationItemActive(pathname, item)}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

function SidebarContent({
  navigationContext,
  roleLabel,
  collapsed = false,
  onNavigate,
  onToggleCollapsed,
}: {
  navigationContext: NavigationContext;
  roleLabel: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapsed?: () => void;
}) {
  const pathname = usePathname();
  const primaryItems = getPrimaryNavigationForUser(navigationContext);
  const secondaryItems = getSecondaryNavigationForUser(navigationContext);
  const sections: NavigationSection[] = ["overview", "sales", "work"];

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col">
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b",
            collapsed ? "justify-center px-2" : "justify-between gap-2.5 px-3",
          )}
        >
          <Link
            href="/dashboard"
            className="min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={onNavigate}
            aria-label="LeadFlow dashboard"
          >
            <LeadFlowLogo
              showWordmark={!collapsed}
              subtitle="Lead management"
              className={collapsed ? "gap-0" : undefined}
              wordmarkClassName="text-foreground"
            />
          </Link>

          {onToggleCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleCollapsed}
                  className={cn(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    collapsed && "absolute -right-3 top-4 z-10",
                  )}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {collapsed ? (
                    <PanelLeftOpen className="size-4" aria-hidden="true" />
                  ) : (
                    <PanelLeftClose className="size-4" aria-hidden="true" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {collapsed ? "Expand sidebar" : "Collapse sidebar"}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        <nav
          aria-label="Primary navigation"
          data-testid="sidebar-navigation-scroll-region"
          className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="space-y-1.5">
            {sections.map((section) => (
              <SidebarSection
                key={section}
                label={navigationSectionLabels[section]}
                items={primaryItems.filter((item) => item.section === section)}
                pathname={pathname}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </nav>

        <div
          className={cn(
            "shrink-0 space-y-1 border-t bg-background/95 py-2.5",
            "px-2.5",
          )}
          data-testid="sidebar-bottom-navigation"
        >
          {secondaryItems.map((item) => (
            <NavigationLink
              key={item.href}
              item={item}
              active={isNavigationItemActive(pathname, item)}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}

          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/settings#profile"
                onClick={onNavigate}
                aria-label={collapsed ? `Profile, ${roleLabel}` : undefined}
                className={cn(
                  "flex h-11 items-center rounded-lg text-sm transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  collapsed ? "justify-center" : "gap-2.5 px-2",
                )}
              >
                <Avatar size="sm" className={cn(!collapsed && "size-8")}>
                  <AvatarFallback className="font-semibold">
                    {roleLabel.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <span className={cn("min-w-0", collapsed && "sr-only")}>
                  <span className="block truncate font-medium text-foreground">
                    Your profile
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {roleLabel} workspace role
                  </span>
                </span>
              </Link>
            </TooltipTrigger>
            {collapsed ? (
              <TooltipContent side="right">Profile · {roleLabel}</TooltipContent>
            ) : null}
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

export function DashboardSidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapsed,
  navigationContext,
  roleLabel,
}: DashboardSidebarProps) {
  return (
    <>
      <aside
        className={cn(
          "relative hidden h-dvh shrink-0 border-r bg-background/95 backdrop-blur transition-[width] duration-300 ease-in-out lg:block",
          collapsed ? "w-[4.5rem]" : "w-[18.5rem]",
        )}
        data-testid="desktop-sidebar"
      >
        <SidebarContent
          navigationContext={navigationContext}
          roleLabel={roleLabel}
          collapsed={collapsed}
          onToggleCollapsed={onToggleCollapsed}
        />
      </aside>

      <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <SheetContent
          side="left"
          className="w-[min(19rem,88vw)] gap-0 p-0 lg:hidden"
          aria-describedby="mobile-navigation-description"
        >
          <SheetTitle className="sr-only">LeadFlow navigation</SheetTitle>
          <SheetDescription id="mobile-navigation-description" className="sr-only">
            Navigate the LeadFlow dashboard and account settings.
          </SheetDescription>
          <SidebarContent
            navigationContext={navigationContext}
            roleLabel={roleLabel}
            onNavigate={onClose}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
