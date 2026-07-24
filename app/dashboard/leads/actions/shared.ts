import { revalidatePathBestEffort as revalidatePath } from "@/lib/revalidation.server";
import { protectLeadMutation } from "@/lib/arcjet";
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

export async function ensureLeadMutationAllowed() {
  return protectLeadMutation();
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
