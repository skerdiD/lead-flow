import "server-only";

import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { workspaceMembers, workspaces, type workspaceRoles } from "@/db/schema";
import { requireUserId } from "@/lib/auth";

export type WorkspaceRole = (typeof workspaceRoles)[number];

export type CurrentWorkspace = {
  id: string;
  name: string;
  ownerUserId: string;
  role: WorkspaceRole;
};

const PERSONAL_WORKSPACE_NAME = "Personal Workspace";

async function getWorkspaceForUser(userId: string) {
  const [membership] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      ownerUserId: workspaces.ownerUserId,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  return membership ?? null;
}

async function createPersonalWorkspace(userId: string) {
  const [createdWorkspace] = await db
    .insert(workspaces)
    .values({
      ownerUserId: userId,
      name: PERSONAL_WORKSPACE_NAME,
    })
    .onConflictDoNothing({ target: workspaces.ownerUserId })
    .returning({
      id: workspaces.id,
      name: workspaces.name,
      ownerUserId: workspaces.ownerUserId,
    });

  const workspace =
    createdWorkspace ??
    (
      await db
        .select({
          id: workspaces.id,
          name: workspaces.name,
          ownerUserId: workspaces.ownerUserId,
        })
        .from(workspaces)
        .where(eq(workspaces.ownerUserId, userId))
        .limit(1)
    )[0];

  if (!workspace) {
    throw new Error("Unable to create personal workspace.");
  }

  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId,
    role: "owner",
  }).onConflictDoNothing({
    target: [workspaceMembers.workspaceId, workspaceMembers.userId],
  });

  return {
    ...workspace,
    role: "owner" as const,
  };
}

export const getCurrentWorkspace = cache(async (): Promise<CurrentWorkspace> => {
  const userId = await requireUserId();
  const existingWorkspace = await getWorkspaceForUser(userId);

  if (existingWorkspace) {
    return existingWorkspace;
  }

  try {
    return await createPersonalWorkspace(userId);
  } catch {
    const resolvedWorkspace = await getWorkspaceForUser(userId);

    if (resolvedWorkspace) {
      return resolvedWorkspace;
    }

    throw new Error("Unable to resolve workspace for current user.");
  }
});

export async function canReadWorkspace(workspaceId: string, userId: string) {
  const [membership] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .limit(1);

  return Boolean(membership);
}

export async function canManageWorkspace(workspaceId: string, userId: string) {
  const [membership] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.role, "owner"),
      ),
    )
    .limit(1);

  return Boolean(membership);
}
