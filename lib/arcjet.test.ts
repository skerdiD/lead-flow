import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { protectMock, requestMock } = vi.hoisted(() => ({
  protectMock: vi.fn(),
  requestMock: vi.fn(),
}));

vi.mock("@arcjet/next", () => ({
  default: vi.fn(() => ({
    protect: protectMock,
  })),
  detectBot: vi.fn((rule) => rule),
  fixedWindow: vi.fn((rule) => rule),
  request: requestMock,
  shield: vi.fn((rule) => rule),
}));

describe("Arcjet protection", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("ARCJET_KEY", "ajkey_test");
    requestMock.mockResolvedValue({ url: "http://localhost/dashboard/leads" });
    protectMock.mockResolvedValue({
      isDenied: () => false,
      reason: {
        isBot: () => false,
        isRateLimit: () => false,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("bypasses Arcjet only in safe E2E test mode", async () => {
    vi.stubEnv("E2E_TEST_MODE", "1");
    vi.stubEnv("E2E_TEST_SECRET", "test-secret");
    vi.stubEnv("NODE_ENV", "development");

    const { protectLeadMutation } = await import("@/lib/arcjet");

    await expect(protectLeadMutation()).resolves.toEqual({ ok: true });
    expect(requestMock).not.toHaveBeenCalled();
    expect(protectMock).not.toHaveBeenCalled();
  });

  it("uses Arcjet protection when E2E test mode is not safe", async () => {
    vi.stubEnv("E2E_TEST_MODE", "1");
    vi.stubEnv("E2E_TEST_SECRET", "test-secret");
    vi.stubEnv("NODE_ENV", "production");

    const { protectLeadMutation } = await import("@/lib/arcjet");

    await expect(protectLeadMutation()).resolves.toEqual({ ok: true });
    expect(requestMock).toHaveBeenCalledOnce();
    expect(protectMock).toHaveBeenCalledOnce();
  });

  it("maps denied Arcjet decisions to app responses", async () => {
    vi.stubEnv("E2E_TEST_MODE", "");
    vi.stubEnv("E2E_TEST_SECRET", "");
    vi.stubEnv("NODE_ENV", "test");
    protectMock.mockResolvedValue({
      isDenied: () => true,
      reason: {
        isBot: () => false,
        isRateLimit: () => true,
      },
    });

    const { protectCsvImport } = await import("@/lib/arcjet");

    await expect(protectCsvImport()).resolves.toEqual({
      ok: false,
      message: "Too many requests. Please wait a moment and try again.",
      status: 429,
    });
  });
});
