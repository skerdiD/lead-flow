import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Building2,
  ContactRound,
  Handshake,
  PlusSquare,
  Clock3,
  Settings,
  ListTodo,
} from "lucide-react";

export type DashboardNavItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};

export type DashboardRouteMeta = Pick<
  DashboardNavItem,
  "title" | "description"
>;

export const dashboardNavItems: DashboardNavItem[] = [
  {
    title: "Dashboard",
    description: "Overview of your leads and pipeline",
    href: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    title: "Leads",
    description: "Manage your contacts and sales opportunities",
    href: "/dashboard/leads",
    icon: Users,
  },
  {
    title: "Add Lead",
    description: "Capture a new sales opportunity",
    href: "/dashboard/leads/new",
    icon: PlusSquare,
    exact: true,
  },
  {
    title: "Accounts",
    description: "Manage customer companies and relationships",
    href: "/dashboard/accounts",
    icon: Building2,
  },
  {
    title: "Contacts",
    description: "Manage the people behind your opportunities",
    href: "/dashboard/contacts",
    icon: ContactRound,
  },
  {
    title: "Deals",
    description: "Manage your revenue pipeline",
    href: "/dashboard/deals",
    icon: Handshake,
  },
  {
    title: "Activity",
    description: "Review recent updates across your workspace",
    href: "/dashboard/activity",
    icon: Clock3,
    exact: true,
  },
  {
    title: "Tasks",
    description: "Manage follow-ups and scheduled work",
    href: "/dashboard/tasks",
    icon: ListTodo,
    exact: true,
  },
  {
    title: "Settings",
    description: "Manage your workspace preferences",
    href: "/dashboard/settings",
    icon: Settings,
    exact: true,
  },
];

const leadDetailRouteMeta: DashboardRouteMeta = {
  title: "Lead details",
  description: "Review the full lead profile",
};

const editLeadRouteMeta: DashboardRouteMeta = {
  title: "Edit lead",
  description: "Update lead details and status",
};

export function getDashboardRouteMeta(pathname: string): DashboardRouteMeta {
  const exactMatch = dashboardNavItems.find((item) => item.href === pathname);

  if (exactMatch) {
    return exactMatch;
  }

  if (/^\/dashboard\/leads\/[^/]+\/edit$/.test(pathname)) {
    return editLeadRouteMeta;
  }

  if (/^\/dashboard\/leads\/[^/]+$/.test(pathname)) {
    return leadDetailRouteMeta;
  }

  const parentMatch = dashboardNavItems.find(
    (item) => !item.exact && pathname.startsWith(`${item.href}/`),
  );

  return parentMatch ?? dashboardNavItems[0];
}
