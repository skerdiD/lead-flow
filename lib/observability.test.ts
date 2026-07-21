import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequestId, isSafeRequestId } from "@/lib/request-id";
import { logger, setLogSinkForTests } from "@/lib/logger.server";
import { DomainError, normalizeError, reportUnexpectedError, setErrorReporterForTests } from "@/lib/error-reporting.server";
import { observeDatabaseOperation } from "@/lib/database-observability.server";

afterEach(() => {
  setLogSinkForTests();
  setErrorReporterForTests();
  vi.unstubAllEnvs();
});

describe("observability foundation", () => {
  it("generates a UUID request ID and accepts only safe incoming UUIDs", () => {
    const generated = createRequestId();
    expect(isSafeRequestId(generated)).toBe(true);
    expect(createRequestId(generated)).toBe(generated);
    expect(createRequestId("not-a-request-id")).not.toBe("not-a-request-id");
  });

  it("redacts sensitive fields and retains correlation context", () => {
    const entries: unknown[] = [];
    setLogSinkForTests((entry) => entries.push(entry));
    logger.warn("security_test", "A safe test event.", {
      requestId: "8a78d32d-5f15-4f32-a7d2-63de995ae181",
      authorization: "Bearer secret",
      nested: { inviteToken: "hidden" },
      email: "customer@example.com",
      phone: "+1 202 555 0100",
    });
    expect(entries[0]).toMatchObject({ requestId: "8a78d32d-5f15-4f32-a7d2-63de995ae181", authorization: "[REDACTED]", nested: { inviteToken: "[REDACTED]" }, email: "[REDACTED]", phone: "[REDACTED]" });
  });

  it("normalizes unknown errors and redacts error messages from stack traces", () => {
    const databaseError = Object.assign(
      new Error("Insert failed for customer@example.com with token=secret"),
      { code: "23505" },
    );

    expect(normalizeError({ code: 42 })).toEqual({
      errorName: "UnknownError",
      errorCode: "42",
    });
    expect(normalizeError(databaseError)).toMatchObject({
      errorName: "Error",
      errorCode: "23505",
      errorStack: expect.stringContaining("Error: [REDACTED]"),
    });
    expect(JSON.stringify(normalizeError(databaseError))).not.toContain("customer@example.com");
    expect(JSON.stringify(normalizeError(databaseError))).not.toContain("token=secret");
  });

  it("does not allow a failing log transport to break product behavior", () => {
    setLogSinkForTests(() => { throw new Error("transport down"); });
    expect(() => logger.info("test", "Still safe.")).not.toThrow();
  });

  it("does not report expected domain errors but reports unexpected failures", async () => {
    const reporter = vi.fn();
    const entries: Array<{ event: string; errorCode?: string; errorStack?: string }> = [];
    setErrorReporterForTests(reporter);
    setLogSinkForTests((entry) => entries.push(entry));
    await expect(reportUnexpectedError(new DomainError("Invalid state"))).resolves.toBe(false);
    await expect(reportUnexpectedError(new Error("Database disconnected"), { requestId: "8a78d32d-5f15-4f32-a7d2-63de995ae181" })).resolves.toBe(true);
    expect(reporter).toHaveBeenCalledOnce();
    expect(entries).toContainEqual(expect.objectContaining({
      event: "unexpected_error",
      requestId: "8a78d32d-5f15-4f32-a7d2-63de995ae181",
      errorCode: "UNKNOWN_ERROR",
      errorStack: expect.stringContaining("Error: [REDACTED]"),
    }));
  });

  it("warns for slow database operations but not fast operations", async () => {
    const entries: Array<{ event: string }> = [];
    setLogSinkForTests((entry) => entries.push(entry));
    vi.stubEnv("SLOW_QUERY_THRESHOLD_MS", "5");
    await observeDatabaseOperation("fast_test", async () => "fast");
    await observeDatabaseOperation("slow_test", () => new Promise((resolve) => setTimeout(resolve, 8)));
    expect(entries.filter((entry) => entry.event === "slow_query")).toHaveLength(1);
  });
});
