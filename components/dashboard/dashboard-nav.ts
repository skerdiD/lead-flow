import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  PlusSquare,
  Settings,
} from "lucide-react";

export type DashboardNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const dashboardNavItems: DashboardNavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    title: "Leads",
    href: "/dashboard/leads",
    icon: Users,
  },
  {
    title: "Add Lead",
    href: "/dashboard/leads/new",
    icon: PlusSquare,
    exact: true,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    exact: true,
  },
];