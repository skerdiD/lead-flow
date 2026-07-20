import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
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

export async function getWorkspaceTeam(workspace: CurrentWorkspace, filters: { search?: string; role?: string } = {}) {
  if (!hasWorkspacePermission(workspace.role, "members:view")) {
    return [] as WorkspaceTeamMember[];
  }

  const search = filters.search?.trim().slice(0, 120) ?? "";
  const role = filters.role === "owner" || filters.role === "admin" || filters.role === "member" ? filters.role : "";
  const membershipConditions = [eq(workspaceMembers.workspaceId, workspace.id)];
  if (role) membershipConditions.push(eq(workspaceMembers.role, role));
  const memberships = await db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      createdAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .where(and(...membershipConditions))
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
  }).filter((member) => !search || [member.name, member.email, member.userId].some((value) => value.toLocaleLowerCase().includes(search.toLocaleLowerCase())));
}
