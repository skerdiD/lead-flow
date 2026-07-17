import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  protectDemoLogin: vi.fn(),
  createDemoSignInUrl: vi.fn(),
}));

vi.mock("@/lib/arcjet", () => ({
  protectDemoLogin: mocks.protectDemoLogin,
}));

vi.mock("@/lib/demo-auth.server", () => ({
  createDemoSignInUrl: mocks.createDemoSignInUrl,
  DemoLoginError: class DemoLoginError extends Error {},
}));

import { POST } from "@/app/api/demo-login/route";

function demoRequest(payload: unknown) {
  return new Request("https://leadflow.example/api/demo-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.protectDemoLogin.mockResolvedValue({ ok: true });
  mocks.createDemoSignInUrl.mockResolvedValue(
    "https://clerk.example/sign-in-token",
  );
});

describe("POST /api/demo-login", () => {
  it("accepts only a single allowlisted role and returns the server-created sign-in URL", async () => {
    const response = await POST(demoRequest({ role: "admin" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      signInUrl: "https://clerk.example/sign-in-token",
    });
    expect(mocks.createDemoSignInUrl).toHaveBeenCalledWith("admin");
  });

  it.each([
    { role: "unknown" },
    { role: "owner", email: "someone@example.com" },
    { role: "member", workspaceId: "other-workspace" },
    { role: "admin", redirectUrl: "https://attacker.example" },
  ])("rejects tampered demo input %#", async (payload) => {
    const response = await POST(demoRequest(payload));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Choose one of the available demo roles to continue.",
      requestId: expect.any(String),
    });
    expect(mocks.createDemoSignInUrl).not.toHaveBeenCalled();
  });

  it("enforces the shared Arcjet protection before making a Clerk request", async () => {
    mocks.protectDemoLogin.mockResolvedValue({
      ok: false,
      status: 429,
      message: "Too many requests. Please wait a moment and try again.",
    });

    const response = await POST(demoRequest({ role: "owner" }));

    expect(response.status).toBe(429);
    expect(mocks.createDemoSignInUrl).not.toHaveBeenCalled();
  });
});
