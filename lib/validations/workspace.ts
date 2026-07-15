import { z } from "zod";

export const invitationRoleSchema = z.enum(["admin", "member"]);

export const inviteWorkspaceMemberSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(255).transform((value) => value.toLowerCase()),
  role: invitationRoleSchema,
});

export const memberIdSchema = z.string().uuid("This team member could not be found.");

export const updateWorkspaceMemberRoleSchema = z.object({
  memberId: memberIdSchema,
  role: invitationRoleSchema,
});

export const transferWorkspaceOwnershipSchema = z.object({
  memberId: memberIdSchema,
});

export const deleteWorkspaceSchema = z.object({
  confirmationName: z.string().trim().min(1).max(160),
});
