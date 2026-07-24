"use server";

import { createHash, randomBytes } from "crypto";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { and, eq, lt } from "drizzle-orm";
import { revalidatePathBestEffort as revalidatePath } from "@/lib/revalidation.server";
import { db } from "@/db";
import {
  accounts,
  activityEvents,
  contacts,
  crmTasks,
  deals,
  leads,
  workspaceInvitations,
  workspaceMembers,
  workspaces,
} from "@/db/schema";
import {
  canManageWorkspaceMember,
  hasWorkspacePermission,
  permissionDeniedMessage,
  workspaceRoleLabels,
} from "@/lib/authorization";
import { requireUserId } from "@/lib/auth";
import { DEMO_MUTATION_MESSAGE, isDemoWorkspace } from "@/lib/demo";
import type { InsertDatabaseClient } from "@/lib/db-client";
import {
  deleteWorkspaceSchema,
  inviteWorkspaceMemberSchema,
  transferWorkspaceOwnershipSchema,
  updateWorkspaceMemberRoleSchema,
} from "@/lib/validations/workspace";
import { getCurrentWorkspace } from "@/lib/workspaces";
import {
  buildWorkspaceInvitationUrl,
  sendWorkspaceInvitationEmail,
  WorkspaceInvitationEmailError,
} from "@/lib/workspace-invitations-email";
import {
  WorkspaceOwnershipError,
  transferWorkspaceOwnershipInTransaction,
} from "@/lib/workspace-ownership";
import { writeAuditEvent } from "@/lib/audit-log.server";
import { getRequestId } from "@/lib/request-context.server";
import { logger } from "@/lib/logger.server";

type WorkspaceActionState =
  | { success: true; message: string; inviteUrl?: string }
  | { success: false; message: string };

const INVITATION_EXPIRY_DAYS = 7;

function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function revalidateWorkspaceSettings() {
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

async function writeWorkspaceActivity(params: {
  client: InsertDatabaseClient;
  workspaceId: string;
  userId: string;
  eventType:
    | "member_invited"
    | "member_removed"
    | "member_role_changed"
    | "ownership_transferred";
  message: string;
}) {
  await params.client.insert(activityEvents).values({
    workspaceId: params.workspaceId,
    userId: params.userId,
    eventType: params.eventType,
    message: params.message,
  });
}

async function getCurrentWorkspaceActor(permission: "members:manage" | "ownership:transfer" | "workspace:delete") {
  const [userId, workspace] = await Promise.all([requireUserId(), getCurrentWorkspace()]);

  if (isDemoWorkspace(workspace)) {
    logger.warn("security_demo_mutation_blocked", "A destructive demo workspace action was blocked.", {
      workspaceId: workspace.id,
      actorUserId: userId,
      entityType: "workspace",
    });
    return { userId, workspace, error: DEMO_MUTATION_MESSAGE };
  }

  if (!hasWorkspacePermission(workspace.role, permission)) {
    logger.warn("security_forbidden_workspace_action", "Workspace member attempted an action without permission.", {
      workspaceId: workspace.id,
      actorUserId: userId,
      entityType: "workspace",
      attemptedPermission: permission,
    });
    return { userId, workspace, error: permissionDeniedMessage(permission) };
  }

  return { userId, workspace, error: null };
}

export async function inviteWorkspaceMemberAction(input: {
  email: string;
  role: "admin" | "member";
}): Promise<WorkspaceActionState> {
  const parsed = inviteWorkspaceMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Enter a valid email address and role." };
  }

  const actor = await getCurrentWorkspaceActor("members:manage");
  if (actor.error) return { success: false, message: actor.error };

  try {
    const client = await clerkClient();
    const knownUsers = await client.users.getUserList({
      emailAddress: [parsed.data.email],
      limit: 1,
    });
    const existingUser = knownUsers.data[0];

    if (existingUser) {
      const [existingMember] = await db
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, actor.workspace.id),
            eq(workspaceMembers.userId, existingUser.id),
          ),
        )
        .limit(1);

      if (existingMember) {
        return { success: false, message: "This person is already a workspace member." };
      }
    }

    const now = new Date();
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashInvitationToken(token);
    const inviteUrl = buildWorkspaceInvitationUrl(token);
    const expiresAt = new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const requestId = await getRequestId();
    let replacedPendingInvitation = false;
    await db.transaction(async (tx) => {
      await tx
        .update(workspaceInvitations)
        .set({ status: "revoked" })
        .where(
          and(
            eq(workspaceInvitations.workspaceId, actor.workspace.id),
            eq(workspaceInvitations.email, parsed.data.email),
            eq(workspaceInvitations.status, "pending"),
            lt(workspaceInvitations.expiresAt, now),
          ),
        );

      const [pendingInvitation] = await tx
        .select({ id: workspaceInvitations.id })
        .from(workspaceInvitations)
        .where(
          and(
            eq(workspaceInvitations.workspaceId, actor.workspace.id),
            eq(workspaceInvitations.email, parsed.data.email),
            eq(workspaceInvitations.status, "pending"),
          ),
        )
        .limit(1);

      if (pendingInvitation) {
        replacedPendingInvitation = true;
        await tx
          .update(workspaceInvitations)
          .set({ status: "revoked" })
          .where(
            and(
              eq(workspaceInvitations.id, pendingInvitation.id),
              eq(workspaceInvitations.status, "pending"),
            ),
          );
      }

      const [invitation] = await tx.insert(workspaceInvitations).values({
        workspaceId: actor.workspace.id,
        email: parsed.data.email,
        role: parsed.data.role,
        tokenHash,
        expiresAt,
        createdByUserId: actor.userId,
      }).returning({ id: workspaceInvitations.id });
      await writeAuditEvent({
        tx, workspaceId: actor.workspace.id, actor: { userId: actor.userId, role: actor.workspace.role },
        action: "member.invited", entity: { type: "invitation", id: invitation!.id },
        after: { role: parsed.data.role }, metadata: { invitedEmail: parsed.data.email }, requestId,
      });
      await writeWorkspaceActivity({
        client: tx,
        workspaceId: actor.workspace.id,
        userId: actor.userId,
        eventType: "member_invited",
        message: `Invited ${parsed.data.email} as ${workspaceRoleLabels[parsed.data.role]}.`,
      });
    });

    // The invitation remains valid even if Clerk's optional profile lookup is
    // temporarily unavailable; use a neutral sender name in that case.
    const inviter = await currentUser().catch(() => null);
    const inviterName =
      [inviter?.firstName, inviter?.lastName].filter(Boolean).join(" ") ||
      inviter?.username ||
      "A teammate";

    let emailDelivered = true;
    try {
      await sendWorkspaceInvitationEmail({
        to: parsed.data.email,
        workspaceName: actor.workspace.name,
        inviterName,
        role: parsed.data.role,
        token,
      });
    } catch (error) {
      emailDelivered = false;
      logger.warn("workspace_invitation_email_unavailable", "Workspace invitation email could not be delivered; a manual link is available when the application URL is configured.", {
        workspaceId: actor.workspace.id,
        actorUserId: actor.userId,
        entityType: "invitation",
        errorCode: error instanceof WorkspaceInvitationEmailError ? error.code : "unknown",
      });

      if (!inviteUrl) {
        await db
          .update(workspaceInvitations)
          .set({ status: "revoked" })
          .where(and(eq(workspaceInvitations.tokenHash, tokenHash), eq(workspaceInvitations.status, "pending")));
        return {
          success: false,
          message: "Invitation delivery needs configuration. Set NEXT_PUBLIC_APP_URL and the Resend email variables, then try again.",
        };
      }
    }

    revalidateWorkspaceSettings();

    if (!emailDelivered) {
      return {
        success: true,
        message: "Invitation created. Email delivery is unavailable, so share the secure invite link instead.",
        inviteUrl: inviteUrl!,
      };
    }

    return {
      success: true,
      message: `${replacedPendingInvitation ? "A new invitation was sent" : "Invitation sent"} to ${parsed.data.email} as ${workspaceRoleLabels[parsed.data.role]}.`,
    };
  } catch (error) {
    logger.error("workspace_invitation_creation_failed", "Workspace invitation could not be finalized.", {
      workspaceId: actor.workspace.id,
      actorUserId: actor.userId,
      entityType: "invitation",
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode: typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
        ? error.code
        : undefined,
    });
    return { success: false, message: "We couldn't create this invitation right now. Please try again." };
  }
}

export async function updateWorkspaceMemberRoleAction(input: {
  memberId: string;
  role: "admin" | "member";
}): Promise<WorkspaceActionState> {
  const parsed = updateWorkspaceMemberRoleSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Select a valid team role." };

  const actor = await getCurrentWorkspaceActor("members:manage");
  if (actor.error) return { success: false, message: actor.error };

  try {
    const [target] = await db
      .select({ id: workspaceMembers.id, userId: workspaceMembers.userId, role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.id, parsed.data.memberId), eq(workspaceMembers.workspaceId, actor.workspace.id)))
      .limit(1);

    if (!target) return { success: false, message: "This team member could not be found." };
    if (target.role === "owner") return { success: false, message: "The workspace owner cannot be changed here." };
    if (!canManageWorkspaceMember(actor.workspace.role, target.role, parsed.data.role)) {
      return { success: false, message: "You do not have permission to change this person's role." };
    }

    if (target.role === parsed.data.role) {
      return { success: true, message: "This team member already has that role." };
    }

    const requestId = await getRequestId();
    const updated = await db.transaction(async (tx) => {
      const [changed] = await tx.update(workspaceMembers)
      .set({ role: parsed.data.role })
      .where(
        and(
          eq(workspaceMembers.id, target.id),
          eq(workspaceMembers.workspaceId, actor.workspace.id),
          eq(workspaceMembers.role, target.role),
        ),
      )
      .returning({ id: workspaceMembers.id });
      if (changed) {
        await writeAuditEvent({ tx, workspaceId: actor.workspace.id, actor: { userId: actor.userId, role: actor.workspace.role }, action: "member.role_changed", entity: { type: "member", id: target.id }, before: { role: target.role }, after: { role: parsed.data.role }, requestId });
        await writeWorkspaceActivity({ client: tx, workspaceId: actor.workspace.id, userId: actor.userId, eventType: "member_role_changed", message: `A team member was changed from ${workspaceRoleLabels[target.role]} to ${workspaceRoleLabels[parsed.data.role]}.` });
      }
      return changed;
    });

    if (!updated) return { success: false, message: "This team member could not be found." };

    revalidateWorkspaceSettings();
    return { success: true, message: "Team member role updated." };
  } catch {
    return { success: false, message: "We couldn't update this team member right now. Please try again." };
  }
}

export async function removeWorkspaceMemberAction(memberId: string): Promise<WorkspaceActionState> {
  const parsed = updateWorkspaceMemberRoleSchema.shape.memberId.safeParse(memberId);
  if (!parsed.success) return { success: false, message: "This team member could not be found." };

  const actor = await getCurrentWorkspaceActor("members:manage");
  if (actor.error) return { success: false, message: actor.error };

  try {
    const [target] = await db
      .select({ id: workspaceMembers.id, userId: workspaceMembers.userId, role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.id, parsed.data), eq(workspaceMembers.workspaceId, actor.workspace.id)))
      .limit(1);

    if (!target) return { success: false, message: "This team member could not be found." };
    if (target.role === "owner") return { success: false, message: "The workspace owner cannot be removed." };
    if (!canManageWorkspaceMember(actor.workspace.role, target.role, undefined, "remove")) {
      return { success: false, message: "You do not have permission to remove this team member." };
    }

    const requestId = await getRequestId();
    const removed = await db.transaction(async (tx) => {
      const [deleted] = await tx.delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.id, target.id),
          eq(workspaceMembers.workspaceId, actor.workspace.id),
          eq(workspaceMembers.role, target.role),
        ),
      )
      .returning({ id: workspaceMembers.id });
      if (!deleted) return null;
      // The former member's CRM work remains in this workspace, explicitly
      // unassigned rather than silently disappearing behind an inaccessible ID.
      await Promise.all([
        tx.update(accounts).set({ assignedOwnerUserId: null, updatedAt: new Date() }).where(and(eq(accounts.workspaceId, actor.workspace.id), eq(accounts.assignedOwnerUserId, target.userId))),
        tx.update(contacts).set({ assignedOwnerUserId: null, updatedAt: new Date() }).where(and(eq(contacts.workspaceId, actor.workspace.id), eq(contacts.assignedOwnerUserId, target.userId))),
        tx.update(leads).set({ assignedOwnerUserId: null, updatedAt: new Date() }).where(and(eq(leads.workspaceId, actor.workspace.id), eq(leads.assignedOwnerUserId, target.userId))),
        tx.update(deals).set({ ownerUserId: null, updatedAt: new Date() }).where(and(eq(deals.workspaceId, actor.workspace.id), eq(deals.ownerUserId, target.userId))),
        tx.update(crmTasks).set({ ownerUserId: null, updatedAt: new Date() }).where(and(eq(crmTasks.workspaceId, actor.workspace.id), eq(crmTasks.ownerUserId, target.userId))),
      ]);
      if (deleted) {
        await writeAuditEvent({ tx, workspaceId: actor.workspace.id, actor: { userId: actor.userId, role: actor.workspace.role }, action: "member.removed", entity: { type: "member", id: target.id }, before: { role: target.role, assignments: "unassigned" }, requestId });
        await writeWorkspaceActivity({ client: tx, workspaceId: actor.workspace.id, userId: actor.userId, eventType: "member_removed", message: "A team member was removed from the workspace." });
      }
      return deleted;
    });

    if (!removed) {
      return {
        success: false,
        message: "This team member changed before they could be removed.",
      };
    }
    revalidateWorkspaceSettings();
    return { success: true, message: "Team member removed and their CRM assignments were set to Unassigned." };
  } catch {
    return { success: false, message: "We couldn't remove this team member right now. Please try again." };
  }
}

export async function transferWorkspaceOwnershipAction(input: { memberId: string }): Promise<WorkspaceActionState> {
  const parsed = transferWorkspaceOwnershipSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Select a valid team member." };

  const actor = await getCurrentWorkspaceActor("ownership:transfer");
  if (actor.error) return { success: false, message: actor.error };

  try {
    const requestId = await getRequestId();
    await db.transaction(async (tx) => {
      await transferWorkspaceOwnershipInTransaction(tx, {
        workspaceId: actor.workspace.id,
        actorUserId: actor.userId,
        targetMemberId: parsed.data.memberId,
        requestId,
      });
    });
    revalidateWorkspaceSettings();
    return { success: true, message: "Ownership transferred. You are now an admin in this workspace." };
  } catch (error) {
    if (error instanceof WorkspaceOwnershipError) {
      logger.warn("security_ownership_transfer_failed", "Workspace ownership transfer was rejected.", {
        workspaceId: actor.workspace.id,
        actorUserId: actor.userId,
        entityType: "workspace",
      });
      return { success: false, message: error.message };
    }

    return { success: false, message: "We couldn't transfer ownership right now. Please try again." };
  }
}

export async function deleteWorkspaceAction(input: { confirmationName: string }): Promise<WorkspaceActionState> {
  const parsed = deleteWorkspaceSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Enter the workspace name to confirm deletion." };

  const actor = await getCurrentWorkspaceActor("workspace:delete");
  if (actor.error) return { success: false, message: actor.error };
  if (parsed.data.confirmationName !== actor.workspace.name) {
    return { success: false, message: "Enter the workspace name exactly to confirm deletion." };
  }

  try {
    const requestId = await getRequestId();
    const deleted = await db.transaction(async (tx) => {
      const [lockedWorkspace] = await tx
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.id, actor.workspace.id))
        .for("update")
        .limit(1);
      if (!lockedWorkspace) return null;

      const [owner] = await tx
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, actor.workspace.id),
            eq(workspaceMembers.userId, actor.userId),
            eq(workspaceMembers.role, "owner"),
          ),
        )
        .for("update")
        .limit(1);
      if (!owner) return null;

      await writeAuditEvent({ tx, workspaceId: actor.workspace.id, actor: { userId: actor.userId, role: actor.workspace.role }, action: "workspace.deleted", entity: { type: "workspace", id: actor.workspace.id }, before: { name: actor.workspace.name }, requestId });
      const [removed] = await tx.delete(workspaces)
      .where(eq(workspaces.id, actor.workspace.id))
      .returning({ id: workspaces.id });
      return removed;
    });

    if (!deleted) return { success: false, message: "Only the workspace owner can delete this workspace." };
    revalidateWorkspaceSettings();
    return { success: true, message: "Workspace deleted." };
  } catch {
    return { success: false, message: "We couldn't delete this workspace right now. Please try again." };
  }
}

export async function acceptWorkspaceInvitationAction(token: string): Promise<WorkspaceActionState> {
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(token)) {
    logger.warn("security_invitation_rejected", "An invitation token had an invalid format.", {
      entityType: "invitation",
    });
    return { success: false, message: "This invitation is invalid or has expired." };
  }

  const [userId, user, currentWorkspace] = await Promise.all([
    requireUserId(),
    currentUser(),
    getCurrentWorkspace(),
  ]);
  if (isDemoWorkspace(currentWorkspace)) {
    return { success: false, message: DEMO_MUTATION_MESSAGE };
  }

  const verifiedEmails = (user?.emailAddresses ?? [])
    .filter((email) => email.verification?.status === "verified")
    .map((email) => email.emailAddress.toLowerCase());

  try {
    const tokenHash = hashInvitationToken(token);
    const requestId = await getRequestId();
    const accepted = await db.transaction(async (tx) => {
      const [invitation] = await tx
        .select({
          id: workspaceInvitations.id,
          workspaceId: workspaceInvitations.workspaceId,
          email: workspaceInvitations.email,
          role: workspaceInvitations.role,
          status: workspaceInvitations.status,
          expiresAt: workspaceInvitations.expiresAt,
        })
        .from(workspaceInvitations)
        .where(eq(workspaceInvitations.tokenHash, tokenHash))
        .limit(1);

      if (!invitation || invitation.status !== "pending" || invitation.expiresAt <= new Date()) {
        throw new Error("This invitation is invalid or has expired.");
      }
      if (!verifiedEmails.includes(invitation.email.toLowerCase())) {
        throw new Error("Sign in with the email address that received this invitation.");
      }

      const [existingMembership] = await tx
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, invitation.workspaceId), eq(workspaceMembers.userId, userId)))
        .limit(1);
      if (existingMembership) throw new Error("You already have access to this workspace.");

      const [claimed] = await tx
        .update(workspaceInvitations)
        .set({ status: "accepted", acceptedAt: new Date(), acceptedByUserId: userId })
        .where(and(eq(workspaceInvitations.id, invitation.id), eq(workspaceInvitations.status, "pending")))
        .returning({ id: workspaceInvitations.id });
      if (!claimed) throw new Error("This invitation has already been used.");

      await tx.insert(workspaceMembers).values({
        workspaceId: invitation.workspaceId,
        userId,
        role: invitation.role,
      });
      await tx.insert(activityEvents).values({
        workspaceId: invitation.workspaceId,
        userId,
        eventType: "invitation_accepted",
        message: `A new ${workspaceRoleLabels[invitation.role]} joined the workspace.`,
      });
      await writeAuditEvent({ tx, workspaceId: invitation.workspaceId, actor: { userId, role: invitation.role }, action: "member.invitation_accepted", entity: { type: "invitation", id: invitation.id }, after: { role: invitation.role }, requestId });
      return invitation;
    });

    const { setActiveWorkspace } = await import("@/lib/workspaces");
    try {
      await setActiveWorkspace(accepted.workspaceId);
    } catch (error) {
      logger.warn("workspace_activation_failed", "The accepted workspace could not be activated automatically.", {
        workspaceId: accepted.workspaceId,
        actorUserId: userId,
        entityType: "workspace",
        operation: "workspace.activate_after_invitation",
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorCategory: "secondary_async_failure",
      });
      revalidateWorkspaceSettings();
      return { success: true, message: "You joined the workspace. Refresh and select it to continue." };
    }
    revalidateWorkspaceSettings();
    return { success: true, message: "You joined the workspace." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "We couldn't accept this invitation right now. Please try again.";
    if (message.startsWith("This invitation") || message.startsWith("You already")) {
      logger.warn("security_invitation_rejected", "An invitation was invalid, expired, or already used.", {
        actorUserId: userId,
        entityType: "invitation",
      });
    }
    return { success: false, message: message.startsWith("This invitation") || message.startsWith("Sign in") || message.startsWith("You already") ? message : "We couldn't accept this invitation right now. Please try again." };
  }
}
