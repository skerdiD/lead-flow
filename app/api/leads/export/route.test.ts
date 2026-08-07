import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  protect: vi.fn(),
  authorization: vi.fn(),
  buildWhere: vi.fn(),
  normalizeFilters: vi.fn(),
  getSort: vi.fn(),
  select: vi.fn(),
  transaction: vi.fn(),
  writeAudit: vi.fn(),
  buildCsv: vi.fn(),
}));

function selectBuilder(rows: unknown[]) {
  const builder = {
    from: vi.fn(() => builder),
    where: vi.fn(() => builder),
    orderBy: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (
      onFulfilled: (value: unknown[]) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(rows).then(onFulfilled, onRejected),
  };
  return builder;
}

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions: unknown[]) => ({ conditions })),
  asc: vi.fn((value: unknown) => value),
  inArray: vi.fn((column: unknown, values: unknown[]) => ({ column, values })),
}));
vi.mock("@/db/schema", () => ({
  leads: {
    id: "lead_id",
    fullName: "full_name",
    company: "company",
    email: "email",
    phone: "phone",
    status: "status",
    source: "source",
    createdAt: "created_at",
  },
}));
vi.mock("@/db", () => ({
  db: {
    select: mocks.select,
    transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/arcjet", () => ({
  enforceRateLimit: mocks.protect,
  rateLimitHeaders: (result: { retryAfter?: number }) => result.retryAfter ? { "Retry-After": String(result.retryAfter) } : undefined,
}));
vi.mock("@/lib/authorization", () => ({
  getCurrentWorkspaceAuthorizationContext: mocks.authorization,
  hasWorkspacePermission: (role: string) => role === "owner" || role === "admin",
  permissionDeniedMessage: () => "You do not have permission to export workspace data.",
}));
vi.mock("@/app/dashboard/leads/queries", () => ({
  buildLeadsWhereConditions: mocks.buildWhere,
  normalizeLeadsFilters: mocks.normalizeFilters,
  getLeadsSortOrder: mocks.getSort,
}));
vi.mock("@/lib/leads-export", () => ({
  buildLeadsCsv: mocks.buildCsv,
  buildLeadsPdf: vi.fn(),
}));
vi.mock("@/lib/audit-log.server", () => ({ writeAuditEvent: mocks.writeAudit }));
vi.mock("@/lib/request-context.server", () => ({
  getRequestId: vi.fn(async () => "11111111-1111-4111-8111-111111111111"),
}));

import { GET } from "@/app/api/leads/export/route";

const activeContext = {
  workspaceId: "workspace-active",
  userId: "admin-user",
  role: "admin" as const,
};

describe("GET /api/leads/export authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.protect.mockResolvedValue({ ok: true });
    mocks.authorization.mockResolvedValue(activeContext);
    mocks.normalizeFilters.mockImplementation((filters: Record<string, unknown>) => ({
      search: filters.search ?? "",
      status: filters.status ?? "",
      source: filters.source ?? "",
      owner: filters.owner ?? "",
      archived: "active",
      sortBy: "createdAt",
      sortDir: "desc",
    }));
    mocks.buildWhere.mockReturnValue({ conditions: [{ tenantScoped: true }], sourceLabel: "source" });
    mocks.getSort.mockReturnValue({ primarySort: "created_at", secondarySort: "name" });
    mocks.select.mockImplementation(() => selectBuilder([]));
    mocks.transaction.mockImplementation(async (callback: (tx: object) => unknown) => callback({ insert: vi.fn() }));
    mocks.buildCsv.mockReturnValue("csv-data");
  });

  it("rejects an unauthenticated direct call before querying or generating a file", async () => {
    mocks.authorization.mockRejectedValue(new Error("AUTHENTICATION_REQUIRED"));

    await expect(GET(new Request("https://leadflow.test/api/leads/export"))).rejects.toThrow(
      "AUTHENTICATION_REQUIRED",
    );
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.buildCsv).not.toHaveBeenCalled();
  });

  it("rejects an authenticated user with no active-workspace membership", async () => {
    mocks.authorization.mockRejectedValue(new Error("WORKSPACE_ACCESS_DENIED"));

    await expect(GET(new Request("https://leadflow.test/api/leads/export"))).rejects.toThrow(
      "WORKSPACE_ACCESS_DENIED",
    );
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("returns a generic forbidden response for a member without export permission", async () => {
    mocks.authorization.mockResolvedValue({ ...activeContext, role: "member" });

    const response = await GET(new Request("https://leadflow.test/api/leads/export"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "You do not have permission to export workspace data.",
    });
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("ignores a modified workspace parameter, scopes filters to the active workspace, and audits the export", async () => {
    const response = await GET(
      new Request(
        "https://leadflow.test/api/leads/export?workspaceId=workspace-attacker&owner=outside-user&search=secret&selected=22222222-2222-4222-8222-222222222222&format=csv",
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.buildWhere).toHaveBeenCalledWith(
      "workspace-active",
      expect.objectContaining({ owner: "outside-user", search: "secret" }),
      activeContext,
    );
    expect(mocks.buildWhere.mock.calls[0]?.[1]).not.toHaveProperty("workspaceId");
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace-active",
        actor: { userId: "admin-user", role: "admin" },
        action: "export.created",
        metadata: expect.objectContaining({
          ownerFilterApplied: true,
          searchFilterApplied: true,
        }),
      }),
    );
    const auditInput = mocks.writeAudit.mock.calls[0]?.[0];
    expect(JSON.stringify(auditInput)).not.toContain("outside-user");
    expect(JSON.stringify(auditInput)).not.toContain("secret");
    expect(JSON.stringify(auditInput)).not.toContain("22222222-2222-4222-8222-222222222222");
  });
});
