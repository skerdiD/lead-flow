import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  createDemoSignInUrl: vi.fn(),
}));

vi.mock("@/lib/arcjet", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  rateLimitHeaders: (result: { retryAfter?: number }) => result.retryAfter ? { "Retry-After": String(result.retryAfter) } : undefined,
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
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  mocks.enforceRateLimit.mockResolvedValue({ ok: true });
  mocks.createDemoSignInUrl.mockResolvedValue(
    "https://clerk.example/sign-in-token",
  );
});

describe("POST /api/demo-login", () => {
  it("uses the local role override instead of Clerk in safe E2E mode", async () => {
    vi.stubEnv("E2E_TEST_MODE", "1");
    vi.stubEnv("E2E_TEST_SECRET", "test-secret");
    vi.stubEnv("NODE_ENV", "test");

    const response = await POST(demoRequest({ role: "admin" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ signInUrl: "/dashboard" });
    expect(response.headers.get("set-cookie")).toContain(
      "leadflow_e2e_workspace_role=admin",
    );
    expect(mocks.createDemoSignInUrl).not.toHaveBeenCalled();
  });

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
    mocks.enforceRateLimit.mockResolvedValue({
      ok: false,
      status: 429,
      message: "Too many requests. Please wait a moment and try again.",
      retryAfter: 42,
    });

    const response = await POST(demoRequest({ role: "owner" }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(mocks.createDemoSignInUrl).not.toHaveBeenCalled();
  });
});
