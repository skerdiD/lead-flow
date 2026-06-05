import { afterEach, describe, expect, it, vi } from "vitest";
import { isSafeE2ETestMode } from "@/lib/e2e-test-mode";

describe("isSafeE2ETestMode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows test mode only outside production with a test secret", () => {
    vi.stubEnv("E2E_TEST_MODE", "1");
    vi.stubEnv("E2E_TEST_SECRET", "test-secret");
    vi.stubEnv("NODE_ENV", "development");

    expect(isSafeE2ETestMode()).toBe(true);
  });

  it("never allows test mode in production", () => {
    vi.stubEnv("E2E_TEST_MODE", "1");
    vi.stubEnv("E2E_TEST_SECRET", "test-secret");
    vi.stubEnv("NODE_ENV", "production");

    expect(isSafeE2ETestMode()).toBe(false);
  });

  it("requires an explicit test secret", () => {
    vi.stubEnv("E2E_TEST_MODE", "1");
    vi.stubEnv("E2E_TEST_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");

    expect(isSafeE2ETestMode()).toBe(false);
  });
});
