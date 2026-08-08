import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimitPolicies } from "@/lib/rate-limit-policies";

const mocks = vi.hoisted(() => ({
  protect: vi.fn(),
  request: vi.fn(),
  arcjet: vi.fn(),
  fixedWindow: vi.fn((rule: unknown) => rule),
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock("@arcjet/next", () => ({
  default: mocks.arcjet,
  detectBot: vi.fn((rule) => rule),
  fixedWindow: mocks.fixedWindow,
  request: mocks.request,
  shield: vi.fn((rule) => rule),
}));
vi.mock("@/lib/logger.server", () => ({
  logger: mocks.logger,
  logMetric: vi.fn(),
}));
vi.mock("@/lib/request-context.server", () => ({ getRequestId: vi.fn(async () => "request-id") }));

function allowed() {
  return {
    conclusion: "ALLOW",
    results: [],
    isErrored: () => false,
    isDenied: () => false,
    reason: { isRateLimit: () => false },
  };
}

function denied(retrySeconds = 30) {
  return {
    conclusion: "DENY",
    results: [],
    isErrored: () => false,
    isDenied: () => true,
    reason: { isRateLimit: () => true, resetTime: new Date(Date.now() + retrySeconds * 1000) },
  };
}

describe("action-sensitive rate limiting", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("ARCJET_KEY", "ajkey_test");
    vi.stubEnv("RATE_LIMIT_KEY_SECRET", "stable-test-secret");
    mocks.arcjet.mockImplementation(() => ({ protect: mocks.protect }));
    mocks.request.mockResolvedValue({ headers: new Headers({ "x-forwarded-for": "203.0.113.5" }), url: "https://leadflow.example/action" });
    mocks.protect.mockResolvedValue(allowed());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("allows requests under the provider limit and rejects requests over it", async () => {
    const { enforceRateLimit } = await import("@/lib/arcjet");
    await expect(enforceRateLimit({ action: "lead:create", actorUserId: "user-a", workspaceId: "workspace-a" })).resolves.toEqual({ ok: true });
    mocks.protect.mockResolvedValueOnce(denied(20));
    const result = await enforceRateLimit({ action: "lead:create", actorUserId: "user-a", workspaceId: "workspace-a" });
    expect(result).toMatchObject({ ok: false, status: 429, message: "Too many requests. Please wait and try again." });
    expect(result.ok || result.retryAfter).toBeGreaterThanOrEqual(19);
  });

  it("isolates authenticated users and workspaces while ignoring insignificant request data", async () => {
    const { enforceRateLimit } = await import("@/lib/arcjet");
    const req1 = new Request("https://leadflow.example/leads?color=red", { headers: { "x-forwarded-for": "203.0.113.1" } });
    const req2 = new Request("https://leadflow.example/leads?color=blue", { headers: { "x-forwarded-for": "203.0.113.99" } });
    await enforceRateLimit({ action: "lead:create", actorUserId: "user-a", workspaceId: "workspace-a", request: req1 });
    await enforceRateLimit({ action: "lead:create", actorUserId: "user-b", workspaceId: "workspace-a", request: req1 });
    await enforceRateLimit({ action: "lead:create", actorUserId: "user-a", workspaceId: "workspace-b", request: req1 });
    await enforceRateLimit({ action: "lead:create", actorUserId: "user-a", workspaceId: "workspace-a", request: req2 });
    const keys = mocks.protect.mock.calls.map((call) => call[1].rateLimitKey);
    expect(new Set(keys.slice(0, 3)).size).toBe(3);
    expect(keys[3]).toBe(keys[0]);
  });

  it("uses a privacy-preserving IP-derived key for unauthenticated actions", async () => {
    const { enforceRateLimit } = await import("@/lib/arcjet");
    const ip = "198.51.100.42";
    await enforceRateLimit({ action: "demo:login", request: new Request("https://leadflow.example/api/demo-login", { headers: { "x-forwarded-for": ip } }) });
    const key = mocks.protect.mock.calls[0][1].rateLimitKey as string;
    expect(key).not.toContain(ip);
    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("defines export stricter than reads and demo login stricter than CRM creation", () => {
    expect(rateLimitPolicies["lead:export"].max).toBeLessThan(rateLimitPolicies["read:authenticated"].max);
    expect(rateLimitPolicies["demo:login"].max).toBeLessThan(rateLimitPolicies["lead:create"].max);
  });

  it("fails closed for demo login and open for ordinary CRM work when the provider is unavailable", async () => {
    const { enforceRateLimit } = await import("@/lib/arcjet");
    mocks.protect.mockRejectedValue(new Error("provider unavailable"));
    await expect(enforceRateLimit({ action: "demo:login", request: new Request("https://leadflow.example/api/demo-login") })).resolves.toEqual({
      ok: false,
      status: 503,
      message: "This action is temporarily unavailable. Please try again shortly.",
      retryAfter: 30,
    });
    await expect(enforceRateLimit({ action: "lead:create", actorUserId: "user-a", workspaceId: "workspace-a" })).resolves.toEqual({ ok: true });
    expect(mocks.logger.error).toHaveBeenCalledWith(
      "rate_limit_provider_unavailable",
      "Rate-limit provider could not make a decision.",
      expect.objectContaining({ operation: "demo:login", errorName: "Error" }),
    );
    expect(mocks.logger.warn).toHaveBeenCalledWith(
      "rate_limit_provider_unavailable",
      "Rate-limit provider could not make a decision.",
      expect.objectContaining({ operation: "lead:create", errorName: "Error" }),
    );
  });

  it("does not expose policy numbers or internal provider details in errors", async () => {
    const { enforceRateLimit } = await import("@/lib/arcjet");
    mocks.protect.mockResolvedValue(denied());
    const result = await enforceRateLimit({ action: "lead:export", actorUserId: "user-a", workspaceId: "workspace-a" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).not.toMatch(/Arcjet|5|10m|policy/i);
    }
  });
});
