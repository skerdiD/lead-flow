import { revalidatePathBestEffort as revalidatePath } from "@/lib/revalidation.server";
import { enforceRateLimit } from "@/lib/arcjet";
import type { RateLimitAction } from "@/lib/rate-limit-policies";
import { requireUserId } from "@/lib/auth";
import { getCurrentWorkspace } from "@/lib/workspaces";
import {
  canAccessRecord,
  getWorkspaceAuthorizationContext,
  hasWorkspacePermission,
  permissionDeniedMessage,
  type WorkspacePermission,
  type WorkspaceRole,
} from "@/lib/authorization";

export function revalidateLeadPaths(leadId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/activity");
  revalidatePath(`/dashboard/leads/${leadId}`);
  revalidatePath(`/dashboard/leads/${leadId}/edit`);
}

export async function ensureLeadMutationAllowed(action: RateLimitAction = "crm:mutation") {
  const [actorUserId, workspace] = await Promise.all([requireUserId(), getCurrentWorkspace()]);
  return enforceRateLimit({ action, actorUserId, workspaceId: workspace.id });
}

export function workspacePermissionError(
  role: "owner" | "admin" | "member",
  permission: WorkspacePermission,
) {
  return hasWorkspacePermission(role, permission)
    ? null
    : permissionDeniedMessage(permission);
}

export function crmUpdatePermissionError(
  role: "owner" | "admin" | "member",
) {
  return hasWorkspacePermission(role, "crm:update_all") ||
    hasWorkspacePermission(role, "crm:update_assigned")
    ? null
    : permissionDeniedMessage("crm:update_assigned");
}

export function canAccessWorkspaceRecord(
  workspace: { id: string; role: WorkspaceRole },
  userId: string,
  assignedUserId: string | null,
  action: "view" | "update" | "delete" | "assign",
) {
  return canAccessRecord(
    getWorkspaceAuthorizationContext(workspace, userId),
    { workspaceId: workspace.id, assignedUserId },
    action,
  );
}
