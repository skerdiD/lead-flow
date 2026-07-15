"use server";

import { createHash, randomBytes } from "crypto";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { and, eq, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  activityEvents,
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
import {
  deleteWorkspaceSchema,
  inviteWorkspaceMemberSchema,
  transferWorkspaceOwnershipSchema,
  updateWorkspaceMemberRoleSchema,
} from "@/lib/validations/workspace";
import { getCurrentWorkspace } from "@/lib/workspaces";
import { sendWorkspaceInvitationEmail } from "@/lib/workspace-invitations-email";

type WorkspaceActionState = { success: true; message: string } | { success: false; message: string };

const INVITATION_EXPIRY_DAYS = 7;

function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function revalidateWorkspaceSettings() {
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

async function writeWorkspaceActivity(params: {
  workspaceId: string;
  userId: string;
  eventType:
    | "member_invited"
    | "member_removed"
    | "member_role_changed"
    | "ownership_transferred";
  message: string;
}) {
  await db.insert(activityEvents).values({
    workspaceId: params.workspaceId,
    userId: params.userId,
    eventType: params.eventType,
    message: params.message,
  });
}

async function getCurrentWorkspaceActor(permission: "members:invite" | "members:remove" | "members:change_role" | "workspace:transfer_ownership" | "workspace:delete") {
  const [userId, workspace] = await Promise.all([requireUserId(), getCurrentWorkspace()]);

  if (!hasWorkspacePermission(workspace.role, permission)) {
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

  const actor = await getCurrentWorkspaceActor("members:invite");
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
    const expiresAt = new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

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
        throw new Error("A pending invitation already exists for this email address.");
      }

      await tx.insert(workspaceInvitations).values({
        workspaceId: actor.workspace.id,
        email: parsed.data.email,
        role: parsed.data.role,
        tokenHash,
        expiresAt,
        createdByUserId: actor.userId,
      });
    });

    const inviter = await currentUser();
    const inviterName =
      [inviter?.firstName, inviter?.lastName].filter(Boolean).join(" ") ||
      inviter?.username ||
      "A teammate";

    try {
      await sendWorkspaceInvitationEmail({
        to: parsed.data.email,
        workspaceName: actor.workspace.name,
        inviterName,
        role: parsed.data.role,
        token,
      });
    } catch {
      await db
        .update(workspaceInvitations)
        .set({ status: "revoked" })
        .where(and(eq(workspaceInvitations.tokenHash, tokenHash), eq(workspaceInvitations.status, "pending")));
      return {
        success: false,
        message: "We couldn't send this invitation. Check the workspace email configuration and try again.",
      };
    }

    await writeWorkspaceActivity({
      workspaceId: actor.workspace.id,
      userId: actor.userId,
      eventType: "member_invited",
      message: `Invited ${parsed.data.email} as ${workspaceRoleLabels[parsed.data.role]}.`,
    });
    revalidateWorkspaceSettings();

    return {
      success: true,
      message: `Invitation sent to ${parsed.data.email} as ${workspaceRoleLabels[parsed.data.role]}.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "We couldn't create this invitation right now. Please try again.";
    return { success: false, message: message === "A pending invitation already exists for this email address." ? message : "We couldn't create this invitation right now. Please try again." };
  }
}

export async function updateWorkspaceMemberRoleAction(input: {
  memberId: string;
  role: "admin" | "member";
}): Promise<WorkspaceActionState> {
  const parsed = updateWorkspaceMemberRoleSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Select a valid team role." };

  const actor = await getCurrentWorkspaceActor("members:change_role");
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

    const [updated] = await db
      .update(workspaceMembers)
      .set({ role: parsed.data.role })
      .where(and(eq(workspaceMembers.id, target.id), eq(workspaceMembers.workspaceId, actor.workspace.id)))
      .returning({ id: workspaceMembers.id });

    if (!updated) return { success: false, message: "This team member could not be found." };

    await writeWorkspaceActivity({
      workspaceId: actor.workspace.id,
      userId: actor.userId,
      eventType: "member_role_changed",
      message: `A team member was changed from ${workspaceRoleLabels[target.role]} to ${workspaceRoleLabels[parsed.data.role]}.`,
    });
    revalidateWorkspaceSettings();
    return { success: true, message: "Team member role updated." };
  } catch {
    return { success: false, message: "We couldn't update this team member right now. Please try again." };
  }
}

export async function removeWorkspaceMemberAction(memberId: string): Promise<WorkspaceActionState> {
  const parsed = updateWorkspaceMemberRoleSchema.shape.memberId.safeParse(memberId);
  if (!parsed.success) return { success: false, message: "This team member could not be found." };

  const actor = await getCurrentWorkspaceActor("members:remove");
  if (actor.error) return { success: false, message: actor.error };

  try {
    const [target] = await db
      .select({ id: workspaceMembers.id, role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.id, parsed.data), eq(workspaceMembers.workspaceId, actor.workspace.id)))
      .limit(1);

    if (!target) return { success: false, message: "This team member could not be found." };
    if (target.role === "owner") return { success: false, message: "The workspace owner cannot be removed." };
    if (!canManageWorkspaceMember(actor.workspace.role, target.role, undefined, "remove")) {
      return { success: false, message: "You do not have permission to remove this team member." };
    }

    await db.delete(workspaceMembers).where(and(eq(workspaceMembers.id, target.id), eq(workspaceMembers.workspaceId, actor.workspace.id)));
    await writeWorkspaceActivity({
      workspaceId: actor.workspace.id,
      userId: actor.userId,
      eventType: "member_removed",
      message: "A team member was removed from the workspace.",
    });
    revalidateWorkspaceSettings();
    return { success: true, message: "Team member removed from the workspace." };
  } catch {
    return { success: false, message: "We couldn't remove this team member right now. Please try again." };
  }
}

export async function transferWorkspaceOwnershipAction(input: { memberId: string }): Promise<WorkspaceActionState> {
  const parsed = transferWorkspaceOwnershipSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Select a valid team member." };

  const actor = await getCurrentWorkspaceActor("workspace:transfer_ownership");
  if (actor.error) return { success: false, message: actor.error };

  try {
    await db.transaction(async (tx) => {
      const [owner] = await tx
        .select({ id: workspaceMembers.id, role: workspaceMembers.role })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, actor.workspace.id), eq(workspaceMembers.userId, actor.userId)))
        .limit(1);
      const [target] = await tx
        .select({ id: workspaceMembers.id, userId: workspaceMembers.userId, role: workspaceMembers.role })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.id, parsed.data.memberId), eq(workspaceMembers.workspaceId, actor.workspace.id)))
        .limit(1);

      if (!owner || owner.role !== "owner") throw new Error("Only the workspace owner can transfer ownership.");
      if (!target) throw new Error("This team member could not be found.");
      if (target.role === "owner") throw new Error("This person is already the workspace owner.");

      // Demote first so the database's one-owner index is never violated.
      await tx.update(workspaceMembers).set({ role: "admin" }).where(eq(workspaceMembers.id, owner.id));
      await tx.update(workspaceMembers).set({ role: "owner" }).where(eq(workspaceMembers.id, target.id));
      await tx
        .update(workspaces)
        .set({ ownerUserId: target.userId, updatedAt: new Date() })
        .where(and(eq(workspaces.id, actor.workspace.id), eq(workspaces.ownerUserId, actor.userId)));
    });

    await writeWorkspaceActivity({
      workspaceId: actor.workspace.id,
      userId: actor.userId,
      eventType: "ownership_transferred",
      message: "Workspace ownership was transferred to another team member.",
    });
    revalidateWorkspaceSettings();
    return { success: true, message: "Ownership transferred. You are now an admin in this workspace." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "We couldn't transfer ownership right now. Please try again.";
    return { success: false, message: message.startsWith("Only the workspace owner") || message.startsWith("This team member") || message.startsWith("This person") ? message : "We couldn't transfer ownership right now. Please try again." };
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
    const [deleted] = await db
      .delete(workspaces)
      .where(and(eq(workspaces.id, actor.workspace.id), eq(workspaces.ownerUserId, actor.userId)))
      .returning({ id: workspaces.id });

    if (!deleted) return { success: false, message: "Only the workspace owner can delete this workspace." };
    revalidateWorkspaceSettings();
    return { success: true, message: "Workspace deleted." };
  } catch {
    return { success: false, message: "We couldn't delete this workspace right now. Please try again." };
  }
}

export async function acceptWorkspaceInvitationAction(token: string): Promise<WorkspaceActionState> {
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(token)) {
    return { success: false, message: "This invitation is invalid or has expired." };
  }

  const [userId, user] = await Promise.all([requireUserId(), currentUser()]);
  const verifiedEmails = (user?.emailAddresses ?? [])
    .filter((email) => email.verification?.status === "verified")
    .map((email) => email.emailAddress.toLowerCase());

  try {
    const tokenHash = hashInvitationToken(token);
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
      return invitation;
    });

    const { setActiveWorkspace } = await import("@/lib/workspaces");
    await setActiveWorkspace(accepted.workspaceId);
    revalidateWorkspaceSettings();
    return { success: true, message: "You joined the workspace." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "We couldn't accept this invitation right now. Please try again.";
    return { success: false, message: message.startsWith("This invitation") || message.startsWith("Sign in") || message.startsWith("You already") ? message : "We couldn't accept this invitation right now. Please try again." };
  }
}
