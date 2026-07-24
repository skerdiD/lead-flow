import { and, eq } from "drizzle-orm";
import { activityEvents, workspaceMembers, workspaces } from "@/db/schema";
import { writeAuditEvent } from "@/lib/audit-log.server";
import type { db } from "@/db";

type WorkspaceOwnershipTransaction = Pick<
  typeof db,
  "insert" | "select" | "update"
>;

export class WorkspaceOwnershipError extends Error {}

export async function transferWorkspaceOwnershipInTransaction(
  tx: WorkspaceOwnershipTransaction,
  input: {
    workspaceId: string;
    actorUserId: string;
    targetMemberId: string;
    requestId?: string;
  },
) {
  const [workspace] = await tx
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.id, input.workspaceId))
    .for("update")
    .limit(1);

  if (!workspace) {
    throw new WorkspaceOwnershipError("This workspace could not be found.");
  }

  const ownerMemberships = await tx
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, input.workspaceId),
        eq(workspaceMembers.role, "owner"),
      ),
    )
    .for("update");

  const currentOwner = ownerMemberships[0];
  if (
    ownerMemberships.length !== 1 ||
    !currentOwner ||
    currentOwner.userId !== input.actorUserId ||
    currentOwner.role !== "owner"
  ) {
    throw new WorkspaceOwnershipError(
      "This workspace has inconsistent ownership data. Resolve it before transferring ownership.",
    );
  }

  const [target] = await tx
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.id, input.targetMemberId),
        eq(workspaceMembers.workspaceId, input.workspaceId),
      ),
    )
    .for("update")
    .limit(1);

  if (!target) {
    throw new WorkspaceOwnershipError(
      "The selected person is not a member of this workspace.",
    );
  }

  if (target.userId === currentOwner.userId || target.role === "owner") {
    throw new WorkspaceOwnershipError("This person is already the workspace owner.");
  }

  if (target.role !== "admin" && target.role !== "member") {
    throw new WorkspaceOwnershipError(
      "The selected person is not eligible to become the workspace owner.",
    );
  }

  const [demotedOwner] = await tx
    .update(workspaceMembers)
    .set({ role: "admin" })
    .where(
      and(
        eq(workspaceMembers.id, currentOwner.id),
        eq(workspaceMembers.workspaceId, input.workspaceId),
        eq(workspaceMembers.role, "owner"),
      ),
    )
    .returning({ id: workspaceMembers.id });

  if (!demotedOwner) {
    throw new WorkspaceOwnershipError(
      "Ownership changed before this transfer could be completed.",
    );
  }

  const [promotedOwner] = await tx
    .update(workspaceMembers)
    .set({ role: "owner" })
    .where(
      and(
        eq(workspaceMembers.id, target.id),
        eq(workspaceMembers.workspaceId, input.workspaceId),
      ),
    )
    .returning({ id: workspaceMembers.id });

  if (!promotedOwner) {
    throw new WorkspaceOwnershipError(
      "The selected person is no longer a member of this workspace.",
    );
  }

  const [updatedWorkspace] = await tx
    .update(workspaces)
    .set({ updatedAt: new Date() })
    .where(eq(workspaces.id, input.workspaceId))
    .returning({ id: workspaces.id });

  if (!updatedWorkspace) {
    throw new WorkspaceOwnershipError(
      "Ownership changed before this transfer could be completed.",
    );
  }

  await tx.insert(activityEvents).values({
    workspaceId: input.workspaceId,
    userId: input.actorUserId,
    eventType: "ownership_transferred",
    message: "Workspace ownership was transferred to another team member.",
  });
  await writeAuditEvent({
    tx,
    workspaceId: input.workspaceId,
    actor: { userId: input.actorUserId, role: "owner" },
    action: "workspace.ownership_transferred",
    entity: { type: "workspace", id: input.workspaceId },
    before: { ownerUserId: input.actorUserId },
    after: { ownerUserId: target.userId },
    metadata: { previousOwnerMemberId: currentOwner.id, newOwnerMemberId: target.id },
    requestId: input.requestId,
  });

  return {
    previousOwnerMemberId: currentOwner.id,
    newOwnerMemberId: target.id,
    newOwnerUserId: target.userId,
  };
}
