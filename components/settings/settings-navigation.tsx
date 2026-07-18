"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isNavigationItemActive,
  type NavigationItem,
} from "@/components/dashboard/dashboard-nav";
import { cn } from "@/lib/utils";

export function SettingsNavigation({ items }: { items: readonly NavigationItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings sections"
      className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isAnchor = item.href.includes("#");
        const active = !isAnchor && isNavigationItemActive(pathname, item);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active && "border-primary/30 bg-primary/10 text-primary",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
