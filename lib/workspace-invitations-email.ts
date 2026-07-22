import "server-only";

import { workspaceRoleLabels, type WorkspaceRole } from "@/lib/authorization";

export type WorkspaceInvitationEmailErrorCode =
  | "app_url_not_configured"
  | "email_not_configured"
  | "email_delivery_failed";

export class WorkspaceInvitationEmailError extends Error {
  constructor(public readonly code: WorkspaceInvitationEmailErrorCode) {
    super(code);
    this.name = "WorkspaceInvitationEmailError";
  }
}

type SendWorkspaceInvitationEmailParams = {
  to: string;
  workspaceName: string;
  inviterName: string;
  role: Extract<WorkspaceRole, "admin" | "member">;
  token: string;
};

function getApplicationUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;

  if (configuredUrl) return configuredUrl;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  // A local invitation can still be copied and shared while developing.
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";

  return null;
}

/** Returns the single-use invitation URL without exposing it in logs or persistence. */
export function buildWorkspaceInvitationUrl(token: string) {
  const applicationUrl = getApplicationUrl();
  if (!applicationUrl) return null;

  try {
    const url = new URL(`/invite/${token}`, applicationUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function sendWorkspaceInvitationEmail({
  to,
  workspaceName,
  inviterName,
  role,
  token,
}: SendWorkspaceInvitationEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const inviteUrl = buildWorkspaceInvitationUrl(token);

  if (!inviteUrl) throw new WorkspaceInvitationEmailError("app_url_not_configured");
  if (!apiKey || !from) throw new WorkspaceInvitationEmailError("email_not_configured");

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
    throw new WorkspaceInvitationEmailError("email_delivery_failed");
  }
}
