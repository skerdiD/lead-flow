import { and, eq, gt, sql } from "drizzle-orm";
import { workspaceInvitations, workspaceMembers } from "@/db/schema";
import type { DatabaseClient } from "@/lib/db-client";

export type InvitationAcceptanceErrorCode =
  | "invalid_or_expired"
  | "email_mismatch"
  | "already_member";

const invitationAcceptanceMessages: Record<
  InvitationAcceptanceErrorCode,
  string
> = {
  invalid_or_expired: "This invitation is invalid or has expired.",
  email_mismatch: "Sign in with the email address that received this invitation.",
  already_member: "You already have access to this workspace.",
};

export class InvitationAcceptanceError extends Error {
  constructor(public readonly code: InvitationAcceptanceErrorCode) {
    super(invitationAcceptanceMessages[code]);
    this.name = "InvitationAcceptanceError";
  }
}

/**
 * Atomically claims a still-pending, unexpired invitation and creates its
 * membership. The conditional UPDATE is the concurrency boundary: once one
 * transaction changes the status, every competing claim returns no row.
 */
export async function acceptWorkspaceInvitationInTransaction(
  client: DatabaseClient,
  params: {
    tokenHash: string;
    userId: string;
    verifiedEmails: string[];
  },
) {
  const [invitation] = await client
    .update(workspaceInvitations)
    .set({
      status: "accepted",
      acceptedAt: sql`CURRENT_TIMESTAMP`,
      acceptedByUserId: params.userId,
    })
    .where(
      and(
        eq(workspaceInvitations.tokenHash, params.tokenHash),
        eq(workspaceInvitations.status, "pending"),
        gt(workspaceInvitations.expiresAt, sql`CURRENT_TIMESTAMP`),
      ),
    )
    .returning({
      id: workspaceInvitations.id,
      workspaceId: workspaceInvitations.workspaceId,
      email: workspaceInvitations.email,
      role: workspaceInvitations.role,
    });

  if (!invitation) {
    throw new InvitationAcceptanceError("invalid_or_expired");
  }

  if (!params.verifiedEmails.includes(invitation.email.toLowerCase())) {
    throw new InvitationAcceptanceError("email_mismatch");
  }

  const [membership] = await client
    .insert(workspaceMembers)
    .values({
      workspaceId: invitation.workspaceId,
      userId: params.userId,
      role: invitation.role,
    })
    .onConflictDoNothing({
      target: [workspaceMembers.workspaceId, workspaceMembers.userId],
    })
    .returning({ id: workspaceMembers.id });

  if (!membership) {
    throw new InvitationAcceptanceError("already_member");
  }

  return invitation;
}
