import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Database,
  FileClock,
  Handshake,
  LayoutDashboard,
  ListTodo,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCircle2,
  Users,
  UsersRound,
} from "lucide-react";
import type { WorkspacePermission } from "@/lib/authorization";

export type NavigationSection = "overview" | "sales" | "work";

export type NavigationContext = {
  permissions: readonly WorkspacePermission[];
  isDemoWorkspace?: boolean;
};

export type NavigationItem = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  activePatterns: readonly string[];
  section?: NavigationSection;
  requiredAnyPermissions?: readonly WorkspacePermission[];
};

export type CreateAction = Pick<
  NavigationItem,
  "label" | "description" | "href" | "icon" | "requiredAnyPermissions"
>;

export type DashboardRouteMeta = {
  title: string;
  description: string;
};

const crmViewPermissions = ["crm:view_all", "crm:view_assigned"] as const;

const primaryNavigation: readonly NavigationItem[] = [
  {
    label: "Dashboard",
    description: "Pipeline, revenue, and work needing attention",
    href: "/dashboard",
    icon: LayoutDashboard,
    activePatterns: ["/dashboard"],
    section: "overview",
    requiredAnyPermissions: ["analytics:view"],
  },
  {
    label: "Leads",
    description: "Review leads and their next steps",
    href: "/dashboard/leads",
    icon: Users,
    activePatterns: ["/dashboard/leads/*"],
    section: "sales",
    requiredAnyPermissions: crmViewPermissions,
  },
  {
    label: "Deals",
    description: "Track deal value, stage, and expected close dates",
    href: "/dashboard/deals",
    icon: Handshake,
    activePatterns: ["/dashboard/deals/*"],
    section: "sales",
    requiredAnyPermissions: crmViewPermissions,
  },
  {
    label: "Customers",
    description: "Keep customer companies and contacts connected",
    href: "/dashboard/customers/accounts",
    icon: Building2,
    activePatterns: [
      "/dashboard/customers/*",
      "/dashboard/accounts/*",
      "/dashboard/contacts/*",
    ],
    section: "sales",
    requiredAnyPermissions: crmViewPermissions,
  },
  {
    label: "Tasks",
    description: "Plan follow-ups and scheduled work",
    href: "/dashboard/tasks",
    icon: ListTodo,
    activePatterns: ["/dashboard/tasks/*"],
    section: "work",
    requiredAnyPermissions: crmViewPermissions,
  },
];

const settingsNavigation: readonly NavigationItem[] = [
  {
    label: "Profile",
    description: "Account identity and sign-in details",
    href: "/dashboard/settings#profile",
    icon: UserCircle2,
    activePatterns: ["/dashboard/settings"],
  },
  {
    label: "Access & security",
    description: "Workspace access and authentication",
    href: "/dashboard/settings#access-security",
    icon: ShieldCheck,
    activePatterns: ["/dashboard/settings"],
  },
  {
    label: "Team & roles",
    description: "Workspace members and role controls",
    href: "/dashboard/settings#team-roles",
    icon: UsersRound,
    activePatterns: ["/dashboard/settings"],
    requiredAnyPermissions: ["members:view"],
  },
  {
    label: "Data & imports",
    description: "CSV imports and import history",
    href: "/dashboard/settings/imports",
    icon: Database,
    activePatterns: [
      "/dashboard/settings/imports/*",
      "/dashboard/import/*",
    ],
    requiredAnyPermissions: ["crm:import"],
  },
  {
    label: "Workspace activity",
    description: "Recent CRM changes in your visible workspace",
    href: "/dashboard/settings/activity",
    icon: FileClock,
    activePatterns: ["/dashboard/settings/activity/*", "/dashboard/activity/*"],
    requiredAnyPermissions: ["analytics:view"],
  },
  {
    label: "Audit log",
    description: "Sensitive workspace and CRM changes",
    href: "/dashboard/settings/audit-log",
    icon: ScrollText,
    activePatterns: ["/dashboard/settings/audit-log/*"],
    requiredAnyPermissions: ["workspace:manage"],
  },
];

const createActions: readonly CreateAction[] = [
  {
    label: "New lead",
    description: "Capture a sales opportunity",
    href: "/dashboard/leads/new",
    icon: Users,
    requiredAnyPermissions: ["crm:create"],
  },
  {
    label: "New deal",
    description: "Add an opportunity to the pipeline",
    href: "/dashboard/deals/new",
    icon: Handshake,
    requiredAnyPermissions: ["crm:create"],
  },
  {
    label: "New account",
    description: "Add a customer company",
    href: "/dashboard/customers/accounts/new",
    icon: Building2,
    requiredAnyPermissions: ["crm:create"],
  },
  {
    label: "New contact",
    description: "Add a customer contact",
    href: "/dashboard/customers/contacts/new",
    icon: UserCircle2,
    requiredAnyPermissions: ["crm:create"],
  },
];

const secondaryNavigation: readonly NavigationItem[] = [
  {
    label: "Settings",
    description: "Account, team, and workspace settings",
    href: "/dashboard/settings",
    icon: Settings,
    activePatterns: [
      "/dashboard/settings/*",
      "/dashboard/import/*",
      "/dashboard/activity/*",
    ],
  },
];

function hasAnyPermission(
  context: NavigationContext,
  permissions: readonly WorkspacePermission[] | undefined,
) {
  return (
    !permissions ||
    permissions.some((permission) => context.permissions.includes(permission))
  );
}

export function canDisplayNavigationItem(
  context: NavigationContext,
  item: Pick<NavigationItem, "requiredAnyPermissions">,
) {
  return hasAnyPermission(context, item.requiredAnyPermissions);
}

export function getPrimaryNavigationForUser(context: NavigationContext) {
  return primaryNavigation.filter((item) =>
    canDisplayNavigationItem(context, item),
  );
}

export function getSecondaryNavigationForUser(context: NavigationContext) {
  return secondaryNavigation.filter((item) =>
    canDisplayNavigationItem(context, item),
  );
}

export function getSettingsNavigationForUser(context: NavigationContext) {
  return settingsNavigation.filter((item) =>
    canDisplayNavigationItem(context, item),
  );
}

export function getCreateActionsForUser(context: NavigationContext) {
  if (context.isDemoWorkspace) return [];

  return createActions.filter((item) =>
    canDisplayNavigationItem(context, item),
  );
}

export function matchesNavigationPattern(pathname: string, pattern: string) {
  if (!pattern.endsWith("/*")) return pathname === pattern;

  const routeRoot = pattern.slice(0, -2);
  return pathname === routeRoot || pathname.startsWith(`${routeRoot}/`);
}

export function isNavigationItemActive(
  pathname: string,
  item: Pick<NavigationItem, "activePatterns">,
) {
  return item.activePatterns.some((pattern) =>
    matchesNavigationPattern(pathname, pattern),
  );
}

export function getDashboardRouteMeta(pathname: string): DashboardRouteMeta {
  if (/^\/dashboard\/leads\/[^/]+\/edit$/.test(pathname)) {
    return { title: "Edit lead", description: "Update lead details and status" };
  }

  if (pathname === "/dashboard/leads/new") {
    return { title: "Create lead", description: "Add a lead and its first details" };
  }

  if (/^\/dashboard\/leads\/[^/]+$/.test(pathname)) {
    return { title: "Lead details", description: "Review the full lead profile" };
  }

  if (pathname.includes("/settings/audit-log")) {
    return { title: "Audit log", description: "Review sensitive workspace changes" };
  }

  if (pathname.includes("/settings/imports") || pathname.startsWith("/dashboard/import")) {
    return { title: "Data & imports", description: "Manage CSV imports and history" };
  }

  if (pathname.includes("/settings/activity") || pathname.startsWith("/dashboard/activity")) {
    return { title: "Workspace activity", description: "Review recent CRM changes" };
  }

  const item = [...primaryNavigation, ...secondaryNavigation].find((candidate) =>
    isNavigationItemActive(pathname, candidate),
  );

  return item
    ? { title: item.label, description: item.description }
    : { title: "Dashboard", description: "Pipeline, revenue, and work needing attention" };
}

export const navigationSectionLabels: Partial<
  Record<NavigationSection, string>
> = {
  sales: "Sales",
  work: "Work",
};
