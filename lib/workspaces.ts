import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { workspaceMembers, workspaces, workspaceRoles } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { isSafeE2ETestMode } from "@/lib/e2e-test-mode";
import { ensureWorkspaceForOwnerInTransaction } from "@/lib/workspace-creation";

export type WorkspaceRole = (typeof workspaceRoles)[number];

export type CurrentWorkspace = {
  id: string;
  name: string;
  role: WorkspaceRole;
};

const PERSONAL_WORKSPACE_NAME = "Personal Workspace";
const ACTIVE_WORKSPACE_COOKIE = "leadflow_active_workspace";
export const E2E_WORKSPACE_ROLE_COOKIE = "leadflow_e2e_workspace_role";

function withE2EWorkspaceRole(
  workspace: CurrentWorkspace,
  roleOverride: string | undefined,
): CurrentWorkspace {
  if (
    isSafeE2ETestMode() &&
    roleOverride &&
    workspaceRoles.includes(roleOverride as WorkspaceRole)
  ) {
    return { ...workspace, role: roleOverride as WorkspaceRole };
  }

  return workspace;
}

async function getWorkspaceForUser(userId: string, workspaceId?: string) {
  const conditions = [eq(workspaceMembers.userId, userId)];

  if (workspaceId) {
    conditions.push(eq(workspaceMembers.workspaceId, workspaceId));
  }

  const [membership] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(and(...conditions))
    .orderBy(desc(workspaceMembers.createdAt))
    .limit(1);

  return membership ?? null;
}

export async function createPersonalWorkspace(userId: string) {
  return db.transaction(async (tx) => {
    const workspace = await ensureWorkspaceForOwnerInTransaction(tx, {
      name: PERSONAL_WORKSPACE_NAME,
      ownerUserId: userId,
    });

    return {
      id: workspace.id,
      name: workspace.name,
      role: "owner" as const,
    };
  });
}

export const getCurrentWorkspace = cache(async (): Promise<CurrentWorkspace> => {
  const userId = await requireUserId();
  const cookieStore = await cookies();
  const e2eRoleOverride = cookieStore.get(E2E_WORKSPACE_ROLE_COOKIE)?.value;
  const preferredWorkspaceId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const preferredWorkspace = preferredWorkspaceId
    ? await getWorkspaceForUser(userId, preferredWorkspaceId)
    : null;

  if (preferredWorkspace) {
    return withE2EWorkspaceRole(preferredWorkspace, e2eRoleOverride);
  }

  const existingWorkspace = await getWorkspaceForUser(userId);

  if (existingWorkspace) {
    return withE2EWorkspaceRole(existingWorkspace, e2eRoleOverride);
  }

  try {
    return withE2EWorkspaceRole(
      await createPersonalWorkspace(userId),
      e2eRoleOverride,
    );
  } catch {
    const resolvedWorkspace = await getWorkspaceForUser(userId);

    if (resolvedWorkspace) {
      return withE2EWorkspaceRole(resolvedWorkspace, e2eRoleOverride);
    }

    throw new Error("Unable to resolve workspace for current user.");
  }
});

export async function setActiveWorkspace(workspaceId: string) {
  const userId = await requireUserId();
  const workspace = await getWorkspaceForUser(userId, workspaceId);

  if (!workspace) {
    throw new Error("You do not have access to this workspace.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspace.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function canReadWorkspace(workspaceId: string, userId: string) {
  return Boolean(await getWorkspaceForUser(userId, workspaceId));
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
