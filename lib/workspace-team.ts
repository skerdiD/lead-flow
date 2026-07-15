import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaceMembers } from "@/db/schema";
import {
  canManageWorkspaceMember,
  hasWorkspacePermission,
  type WorkspaceRole,
} from "@/lib/authorization";
import type { CurrentWorkspace } from "@/lib/workspaces";

export type WorkspaceTeamMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  createdAt: Date;
  canChangeRole: boolean;
  canRemove: boolean;
  canReceiveOwnership: boolean;
};

export async function getWorkspaceTeam(workspace: CurrentWorkspace) {
  if (!hasWorkspacePermission(workspace.role, "members:view")) {
    return [] as WorkspaceTeamMember[];
  }

  const memberships = await db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      createdAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspace.id))
    .orderBy(asc(workspaceMembers.createdAt));

  let usersById = new Map<string, { name: string; email: string }>();
  try {
    const client = await clerkClient();
    const response = await client.users.getUserList({
      userId: memberships.map((membership) => membership.userId),
      limit: Math.max(memberships.length, 1),
    });
    usersById = new Map(
      response.data.map((user) => [
        user.id,
        {
          name:
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            user.username ||
            "Workspace member",
          email: user.primaryEmailAddress?.emailAddress ?? "Email unavailable",
        },
      ]),
    );
  } catch {
    // A temporary Clerk lookup issue must not expose another workspace or block the settings page.
  }

  return memberships.map((membership) => {
    const profile = usersById.get(membership.userId);
    return {
      ...membership,
      name: profile?.name ?? "Workspace member",
      email: profile?.email ?? "Email unavailable",
      canChangeRole: canManageWorkspaceMember(
        workspace.role,
        membership.role,
        membership.role === "admin" ? "member" : "admin",
      ),
      canRemove: canManageWorkspaceMember(workspace.role, membership.role, undefined, "remove"),
      canReceiveOwnership:
        workspace.role === "owner" && membership.role !== "owner",
    };
  });
}
