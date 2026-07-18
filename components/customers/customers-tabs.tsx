"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ContactRound } from "lucide-react";
import { cn } from "@/lib/utils";

const customerTabs = [
  {
    label: "Accounts",
    href: "/dashboard/customers/accounts",
    routeSegment: "/accounts",
    icon: Building2,
  },
  {
    label: "Contacts",
    href: "/dashboard/customers/contacts",
    routeSegment: "/contacts",
    icon: ContactRound,
  },
] as const;

export function CustomersTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Customer record type"
      className="flex max-w-full gap-1 overflow-x-auto rounded-xl border bg-muted/30 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {customerTabs.map((tab) => {
        const active =
          pathname.startsWith(tab.href) || pathname.includes(tab.routeSegment);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-w-32 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
