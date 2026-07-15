import "server-only";

import { workspaceRoleLabels, type WorkspaceRole } from "@/lib/authorization";

type SendWorkspaceInvitationEmailParams = {
  to: string;
  workspaceName: string;
  inviterName: string;
  role: Extract<WorkspaceRole, "admin" | "member">;
  token: string;
};

export async function sendWorkspaceInvitationEmail({
  to,
  workspaceName,
  inviterName,
  role,
  token,
}: SendWorkspaceInvitationEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;

  if (!apiKey || !from || !siteUrl) {
    throw new Error("Invitation email delivery is not configured.");
  }

  const inviteUrl = new URL(`/invite/${token}`, siteUrl).toString();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `${inviterName} invited you to join ${workspaceName}`,
      html: `<p>${inviterName} invited you to join <strong>${workspaceName}</strong> as an <strong>${workspaceRoleLabels[role]}</strong>.</p><p><a href="${inviteUrl}">Accept invitation</a></p><p>This invitation expires in 7 days.</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error("Invitation email delivery failed.");
  }
}
