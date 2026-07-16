import { and, eq, isNull, or, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { workspaceMembers, type workspaceRoles } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { getCurrentWorkspace, type CurrentWorkspace } from "@/lib/workspaces";

export type WorkspaceRole = (typeof workspaceRoles)[number];

/**
 * These permissions are the single policy vocabulary for LeadFlow. Pages may
 * use them for affordances, but every mutation and query remains responsible
 * for applying the matching server-side check and workspace scope.
 */
export const workspacePermissions = [
  "crm:view_all",
  "crm:view_assigned",
  "crm:create",
  "crm:update_all",
  "crm:update_assigned",
  "crm:delete",
  "crm:assign",
  "crm:import",
  "analytics:view",
  "exports:create",
  "members:view",
  "members:manage",
  "workspace:manage",
  "ownership:transfer",
  "workspace:delete",
  "billing:manage",
] as const;

export type WorkspacePermission = (typeof workspacePermissions)[number];

const permissionsByRole: Record<WorkspaceRole, readonly WorkspacePermission[]> = {
  owner: workspacePermissions,
  admin: [
    "crm:view_all",
    "crm:create",
    "crm:update_all",
    "crm:delete",
    "crm:assign",
    "crm:import",
    "analytics:view",
    "exports:create",
    "members:view",
    "members:manage",
    "workspace:manage",
  ],
  member: [
    "crm:view_assigned",
    "crm:create",
    "crm:update_assigned",
    "analytics:view",
  ],
};

export const workspaceRoleLabels: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export type WorkspaceMembership = {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: Date;
};

export type WorkspaceAuthorizationContext = {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
};

export type CrmRecordAction = "view" | "update" | "delete" | "assign";

export type AssignedCrmRecord = {
  workspaceId: string;
  assignedUserId: string | null;
};

export function hasWorkspacePermission(
  role: WorkspaceRole,
  permission: WorkspacePermission,
) {
  return permissionsByRole[role].includes(permission);
}

export function getWorkspaceAuthorizationContext(
  workspace: Pick<CurrentWorkspace, "id" | "role">,
  userId: string,
): WorkspaceAuthorizationContext {
  return {
    workspaceId: workspace.id,
    userId,
    role: workspace.role,
  };
}

export async function getCurrentWorkspaceAuthorizationContext() {
  const [workspace, userId] = await Promise.all([
    getCurrentWorkspace(),
    requireUserId(),
  ]);

  return getWorkspaceAuthorizationContext(workspace, userId);
}

export function canAccessRecord(
  context: WorkspaceAuthorizationContext,
  record: AssignedCrmRecord,
  action: CrmRecordAction,
) {
  if (record.workspaceId !== context.workspaceId) return false;

  switch (action) {
    case "view":
      return (
        hasWorkspacePermission(context.role, "crm:view_all") ||
        (hasWorkspacePermission(context.role, "crm:view_assigned") &&
          record.assignedUserId === context.userId)
      );
    case "update":
      return (
        hasWorkspacePermission(context.role, "crm:update_all") ||
        (hasWorkspacePermission(context.role, "crm:update_assigned") &&
          record.assignedUserId === context.userId)
      );
    case "delete":
      return hasWorkspacePermission(context.role, "crm:delete");
    case "assign":
      return hasWorkspacePermission(context.role, "crm:assign");
  }
}

/** Throws a safe, non-enumerating error suitable for direct URL/API callers. */
export function requireRecordAccess(
  context: WorkspaceAuthorizationContext,
  record: AssignedCrmRecord,
  action: CrmRecordAction,
) {
  if (!canAccessRecord(context, record, action)) {
    throw new Error(recordAccessDeniedMessage(action));
  }

  return record;
}

export function recordAccessDeniedMessage(action: CrmRecordAction) {
  switch (action) {
    case "assign":
      return "You do not have permission to change record assignments.";
    case "update":
      return "This record could not be found or you do not have permission to update it.";
    case "delete":
      return "This record could not be found or you do not have permission to delete it.";
    case "view":
    default:
      return "This record could not be found.";
  }
}

/**
 * Returns tenant and assignment predicates for lead-like records. Members only
 * receive records assigned directly to them; unassigned records are manager-only.
 */
export function getRecordVisibilityConditions(
  context: WorkspaceAuthorizationContext,
  workspaceColumn: AnyPgColumn,
  assignedUserColumn: AnyPgColumn,
): SQL[] {
  const conditions: SQL[] = [eq(workspaceColumn, context.workspaceId)];

  if (!hasWorkspacePermission(context.role, "crm:view_all")) {
    conditions.push(eq(assignedUserColumn, context.userId));
  }

  return conditions;
}

/** Workspace and assignment predicates for an update of a lead-like record. */
export function getRecordUpdateConditions(
  context: WorkspaceAuthorizationContext,
  workspaceColumn: AnyPgColumn,
  assignedUserColumn: AnyPgColumn,
): SQL[] {
  const conditions: SQL[] = [eq(workspaceColumn, context.workspaceId)];

  if (!hasWorkspacePermission(context.role, "crm:update_all")) {
    conditions.push(eq(assignedUserColumn, context.userId));
  }

  return conditions;
}

/**
 * Task ownership is direct. Legacy tasks without an explicit owner remain
 * visible only to their creator, never to every member of the workspace.
 */
export function getTaskVisibilityConditions(
  context: WorkspaceAuthorizationContext,
  workspaceColumn: AnyPgColumn,
  ownerUserColumn: AnyPgColumn,
  createdByUserColumn: AnyPgColumn,
): SQL[] {
  const conditions: SQL[] = [eq(workspaceColumn, context.workspaceId)];

  if (!hasWorkspacePermission(context.role, "crm:view_all")) {
    conditions.push(
      or(
        eq(ownerUserColumn, context.userId),
        and(isNull(ownerUserColumn), eq(createdByUserColumn, context.userId)),
      )!,
    );
  }

  return conditions;
}

export function getTaskUpdateConditions(
  context: WorkspaceAuthorizationContext,
  workspaceColumn: AnyPgColumn,
  ownerUserColumn: AnyPgColumn,
  createdByUserColumn: AnyPgColumn,
): SQL[] {
  const conditions: SQL[] = [eq(workspaceColumn, context.workspaceId)];

  if (!hasWorkspacePermission(context.role, "crm:update_all")) {
    conditions.push(
      or(
        eq(ownerUserColumn, context.userId),
        and(isNull(ownerUserColumn), eq(createdByUserColumn, context.userId)),
      )!,
    );
  }

  return conditions;
}

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
  if (!hasWorkspacePermission(actorRole, "members:manage")) return false;
  if (targetRole === "owner" || requestedRole === "owner") return false;

  if (action === "remove") {
    return targetRole === "admin" || targetRole === "member";
  }

  return requestedRole === "admin" || requestedRole === "member";
}

export function permissionDeniedMessage(permission: WorkspacePermission) {
  switch (permission) {
    case "members:manage":
    case "members:view":
      return "You do not have permission to manage team members.";
    case "ownership:transfer":
      return "Only the workspace owner can transfer ownership.";
    case "workspace:delete":
      return "Only the workspace owner can delete this workspace.";
    case "workspace:manage":
      return "You do not have permission to manage workspace settings.";
    case "exports:create":
      return "You do not have permission to export workspace data.";
    case "crm:delete":
      return "You do not have permission to delete workspace data.";
    case "crm:assign":
      return "You do not have permission to change record assignments.";
    case "crm:import":
      return "You do not have permission to import workspace data.";
    case "crm:view_all":
    case "crm:view_assigned":
      return "You do not have permission to view these records.";
    default:
      return "You do not have permission to make this change.";
  }
}
