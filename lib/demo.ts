export const DEMO_WORKSPACE_NAME = "LeadFlow Demo Workspace";
export const DEMO_WORKSPACE_HELPER_TEXT =
  "Explore realistic CRM activity with safe sample data.";
export const DEMO_MUTATION_MESSAGE =
  "Demo workspace is view-only. Explore the sample CRM data without changing the shared demo.";

export const demoRoles = ["owner", "admin", "member"] as const;
export type DemoRole = (typeof demoRoles)[number];

export const demoRoleDetails: Record<
  DemoRole,
  {
    label: string;
    summary: string;
    description: string;
    permissions: readonly string[];
  }
> = {
  owner: {
    label: "Owner",
    summary: "Full workspace control",
    description:
      "Review every part of the CRM and the workspace controls available to its owner.",
    permissions: [
      "Manage CRM records, analytics, and exports",
      "Manage workspace members and roles",
      "Transfer ownership and manage workspace settings",
    ],
  },
  admin: {
    label: "Admin",
    summary: "Manage CRM operations",
    description:
      "See how a trusted operator can run day-to-day CRM and team workflows.",
    permissions: [
      "Manage CRM records, analytics, and exports",
      "Invite, remove, and change eligible team roles",
      "Cannot transfer ownership, delete the workspace, or manage billing",
    ],
  },
  member: {
    label: "Member",
    summary: "Experience the team workflow",
    description:
      "Explore the focused workspace access available to an individual contributor.",
    permissions: [
      "View, create, and update CRM records",
      "View workspace analytics and the team directory",
      "Cannot delete records, export data, or manage workspace settings",
    ],
  },
};

export function isDemoRole(value: unknown): value is DemoRole {
  return typeof value === "string" && demoRoles.includes(value as DemoRole);
}

export function isDemoWorkspaceName(name: string | null | undefined) {
  return name?.trim() === DEMO_WORKSPACE_NAME;
}

export function isDemoWorkspace(workspace: { name?: string | null } | null | undefined) {
  return isDemoWorkspaceName(workspace?.name);
}
