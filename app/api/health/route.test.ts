import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ execute: vi.fn(), observe: vi.fn() }));
vi.mock("@/db", () => ({ db: { execute: mocks.execute } }));
vi.mock("@/lib/database-observability.server", () => ({ observeDatabaseOperation: mocks.observe }));
vi.mock("@/lib/logger.server", () => ({ logger: { error: vi.fn() } }));

import { GET } from "@/app/api/health/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.observe.mockImplementation((_name, callback) => callback());
  mocks.execute.mockResolvedValue({ rows: [{ '?column?': 1 }] });
});

describe("GET /api/health", () => {
  it("returns readiness status and a request ID header after a healthy database check", async () => {
    const response = await GET(new Request("https://leadflow.example/api/health"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/i);
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
  });

  it("returns a safe unavailable response when the database check fails", async () => {
    mocks.execute.mockRejectedValue(new Error("connection refused"));
    const response = await GET(new Request("https://leadflow.example/api/health"));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ status: "unavailable", requestId: expect.any(String) });
  });
});
