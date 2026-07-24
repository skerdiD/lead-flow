import { and, eq, sql } from "drizzle-orm";
import type { db } from "@/db";
import { workspaceMembers, workspaces } from "@/db/schema";

type WorkspaceCreationTransaction = Pick<
  typeof db,
  "execute" | "insert" | "select"
>;

type OwnedWorkspace = {
  id: string;
  name: string;
  owner: {
    memberId: string;
    userId: string;
  };
};

export async function createWorkspaceWithOwnerInTransaction(
  tx: WorkspaceCreationTransaction,
  input: { name: string; ownerUserId: string },
): Promise<OwnedWorkspace> {
  const [workspace] = await tx
    .insert(workspaces)
    .values({ name: input.name })
    .returning({ id: workspaces.id, name: workspaces.name });

  const [owner] = await tx
    .insert(workspaceMembers)
    .values({
      workspaceId: workspace.id,
      userId: input.ownerUserId,
      role: "owner",
    })
    .returning({
      memberId: workspaceMembers.id,
      userId: workspaceMembers.userId,
    });

  return { ...workspace, owner };
}

export async function ensureWorkspaceForOwnerInTransaction(
  tx: WorkspaceCreationTransaction,
  input: { name: string; ownerUserId: string },
): Promise<OwnedWorkspace> {
  // owner_user_id previously backed a unique owner/name index. Keep the same
  // idempotency under concurrent requests without duplicating ownership data.
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`leadflow:workspace:${input.ownerUserId}:${input.name}`}, 0))`,
  );

  const [existing] = await tx
    .select({
      id: workspaces.id,
      name: workspaces.name,
      memberId: workspaceMembers.id,
      ownerUserId: workspaceMembers.userId,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, input.ownerUserId),
        eq(workspaceMembers.role, "owner"),
        eq(workspaces.name, input.name),
      ),
    )
    .limit(1);

  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      owner: {
        memberId: existing.memberId,
        userId: existing.ownerUserId,
      },
    };
  }

  return createWorkspaceWithOwnerInTransaction(tx, input);
}
