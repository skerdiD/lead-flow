import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildWorkspaceInvitationUrl,
  sendWorkspaceInvitationEmail,
} from "@/lib/workspace-invitations-email";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  vi.stubEnv("VERCEL_URL", "");
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("RESEND_FROM_EMAIL", "");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("workspace invitation email delivery", () => {
  it("creates a local invitation URL when no application URL is configured in development", () => {
    expect(buildWorkspaceInvitationUrl("invite-token")).toBe(
      "http://localhost:3000/invite/invite-token",
    );
  });

  it("requires email delivery configuration without invalidating the invitation URL", async () => {
    await expect(
      sendWorkspaceInvitationEmail({
        to: "teammate@example.com",
        workspaceName: "Acme",
        inviterName: "Taylor",
        role: "member",
        token: "invite-token",
      }),
    ).rejects.toMatchObject({
      code: "email_not_configured",
    });
  });

  it("sends the invitation through Resend when configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("RESEND_FROM_EMAIL", "LeadFlow <team@example.com>");
    fetchMock.mockResolvedValue(new Response(null, { status: 202 }));

    await sendWorkspaceInvitationEmail({
      to: "teammate@example.com",
      workspaceName: "Acme",
      inviterName: "Taylor",
      role: "admin",
      token: "invite-token",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer re_test_key" }),
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      to: ["teammate@example.com"],
      html: expect.stringContaining("https://app.example.com/invite/invite-token"),
    });
  });
});
