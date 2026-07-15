import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaceMembers, type workspaceRoles } from "@/db/schema";
import { requireUserId } from "@/lib/auth";

export type WorkspaceRole = (typeof workspaceRoles)[number];

export const workspacePermissions = [
  "crm:view",
  "crm:create",
  "crm:update",
  "crm:delete",
  "analytics:view",
  "exports:create",
  "members:view",
  "members:invite",
  "members:remove",
  "members:change_role",
  "workspace:update",
  "workspace:transfer_ownership",
  "workspace:delete",
  "billing:manage",
] as const;

export type WorkspacePermission = (typeof workspacePermissions)[number];

const permissionsByRole: Record<WorkspaceRole, readonly WorkspacePermission[]> = {
  owner: workspacePermissions,
  admin: [
    "crm:view",
    "crm:create",
    "crm:update",
    "crm:delete",
    "analytics:view",
    "exports:create",
    "members:view",
    "members:invite",
    "members:remove",
    "members:change_role",
    "workspace:update",
  ],
  member: [
    "crm:view",
    "crm:create",
    "crm:update",
    "analytics:view",
    "members:view",
  ],
};

export const workspaceRoleLabels: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export function hasWorkspacePermission(
  role: WorkspaceRole,
  permission: WorkspacePermission,
) {
  return permissionsByRole[role].includes(permission);
}

export type WorkspaceMembership = {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: Date;
};

export async function requireWorkspaceMembership(workspaceId: string) {
  const userId = await requireUserId();
  const [membership] = await db
    .select({
      id: workspaceMembers.id,
      workspaceId: workspaceMembers.workspaceId,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      createdAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new Error("You do not have access to this workspace.");
  }

  return membership;
}

export async function requireWorkspacePermission(
  workspaceId: string,
  permission: WorkspacePermission,
) {
  const membership = await requireWorkspaceMembership(workspaceId);

  if (!hasWorkspacePermission(membership.role, permission)) {
    throw new Error(permissionDeniedMessage(permission));
  }

  return membership;
}

export function requireWorkspaceRole(
  membership: Pick<WorkspaceMembership, "role">,
  allowedRoles: readonly WorkspaceRole[],
) {
  if (!allowedRoles.includes(membership.role)) {
    throw new Error("You do not have access to this workspace area.");
  }

  return membership;
}

type MemberManagementAction = "remove" | "change_role";

export function canManageWorkspaceMember(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole,
  requestedRole?: WorkspaceRole,
  action: MemberManagementAction = "change_role",
) {
  if (targetRole === "owner" || requestedRole === "owner") return false;

  if (actorRole === "member") return false;

  if (action === "remove") {
    return targetRole === "admin" || targetRole === "member";
  }

  return requestedRole === "admin" || requestedRole === "member";
}

export function permissionDeniedMessage(permission: WorkspacePermission) {
  switch (permission) {
    case "members:invite":
    case "members:remove":
    case "members:change_role":
      return "You do not have permission to manage team members.";
    case "workspace:transfer_ownership":
      return "Only the workspace owner can transfer ownership.";
    case "workspace:delete":
      return "Only the workspace owner can delete this workspace.";
    case "workspace:update":
      return "You do not have permission to manage workspace settings.";
    case "exports:create":
      return "You do not have permission to export workspace data.";
    case "crm:delete":
      return "You do not have permission to delete workspace data.";
    default:
      return "You do not have permission to make this change.";
  }
}
