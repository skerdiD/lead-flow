import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUserIdMock, selectResults, leadsTable } = vi.hoisted(() => ({
  requireUserIdMock: vi.fn(),
  selectResults: [] as unknown[],
  leadsTable: {
    id: "id",
    userId: "user_id",
    fullName: "full_name",
    company: "company",
    email: "email",
    phone: "phone",
    status: "status",
    source: "source",
    createdAt: "created_at",
  },
}));

function createSelectBuilder(result: unknown) {
  const builder = {
    from: vi.fn(() => builder),
    where: vi.fn(() => builder),
    groupBy: vi.fn(() => builder),
    orderBy: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    offset: vi.fn(() => builder),
    then: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };

  return builder;
}

vi.mock("@/db/schema", () => ({
  leads: leadsTable,
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => createSelectBuilder(selectResults.shift() ?? [])),
  },
}));

vi.mock("@/lib/auth", () => ({
  requireUserId: requireUserIdMock,
}));

import { getLeadsList } from "@/app/dashboard/leads/queries";

describe("getLeadsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults.length = 0;
    requireUserIdMock.mockResolvedValue("user_123");
  });

  it("normalizes filters and applies pagination metadata", async () => {
    selectResults.push(
      [{ count: 13 }],
      [
        {
          id: "lead_1",
          fullName: "Jane Doe",
          company: "Acme",
          email: "jane@acme.com",
          phone: null,
          status: "Closed",
          source: "Referral",
          sourceLabel: "Referral",
          createdAt: new Date("2025-01-01T10:00:00.000Z"),
        },
        {
          id: "lead_2",
          fullName: "John Smith",
          company: null,
          email: null,
          phone: "+355691111111",
          status: "Closed",
          source: null,
          sourceLabel: "Unspecified",
          createdAt: new Date("2025-01-02T12:00:00.000Z"),
        },
      ],
      [
        { label: "Referral", count: 8 },
        { label: "Unspecified", count: 5 },
      ],
    );

    const result = await getLeadsList({
      search: "  acme  ",
      status: "Closed",
      source: "  Referral  ",
      sortBy: "createdAt",
      sortDir: "asc",
      page: "99",
      pageSize: "10",
    });

    expect(result.search).toBe("acme");
    expect(result.status).toBe("Closed");
    expect(result.source).toBe("Referral");
    expect(result.sortBy).toBe("createdAt");
    expect(result.sortDir).toBe("asc");
    expect(result.pageSize).toBe(10);
    expect(result.totalCount).toBe(13);
    expect(result.pageCount).toBe(2);
    expect(result.page).toBe(2);
    expect(result.leads).toHaveLength(2);
    expect(result.leads[0]?.createdAt).toBe("2025-01-01T10:00:00.000Z");
    expect(result.sourceOptions).toEqual([
      { label: "Referral", count: 8 },
      { label: "Unspecified", count: 5 },
    ]);
  });
});
