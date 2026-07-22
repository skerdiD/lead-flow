import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentWorkspaceMock, requireUserIdMock, selectResults, leadsTable } = vi.hoisted(() => ({
  getCurrentWorkspaceMock: vi.fn(),
  requireUserIdMock: vi.fn(),
  selectResults: [] as unknown[],
  leadsTable: {
    id: "id",
    workspaceId: "workspace_id",
    userId: "user_id",
    fullName: "full_name",
    company: "company",
    email: "email",
    phone: "phone",
    status: "status",
    source: "source",
    assignedOwnerUserId: "assigned_owner_user_id",
    nextFollowUpDate: "next_follow_up_date",
    followUpNote: "follow_up_note",
    followUpPriority: "follow_up_priority",
    followUpStatus: "follow_up_status",
    isArchived: "is_archived",
    archivedAt: "archived_at",
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

vi.mock("@/lib/workspaces", () => ({
  getCurrentWorkspace: getCurrentWorkspaceMock,
}));

vi.mock("@/lib/auth", () => ({
  requireUserId: requireUserIdMock,
}));

vi.mock("@/lib/workspace-member-profiles.server", () => ({
  getWorkspaceMemberOptions: vi.fn(async () => [
    { userId: "user_123", name: "Jane Owner", imageUrl: null },
  ]),
  resolveWorkspaceMemberProfiles: vi.fn(async () =>
    new Map([
      [
        "user_123",
        { name: "Jane Owner", imageUrl: "https://example.com/jane.png" },
      ],
    ]),
  ),
}));

import { getLeadsList } from "@/app/dashboard/leads/queries";

describe("getLeadsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults.length = 0;
    getCurrentWorkspaceMock.mockResolvedValue({
      id: "workspace_123",
      name: "Personal Workspace",
      ownerUserId: "user_123",
      role: "owner",
    });
    requireUserIdMock.mockResolvedValue("user_123");
  });

  it("normalizes filters and applies pagination metadata", async () => {
    selectResults.push(
      [{ count: 13 }],
      [{ count: 13 }],
      [
        { label: "Referral", count: 8 },
        { label: "Unspecified", count: 5 },
      ],
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
          assignedOwnerUserId: "user_123",
          nextFollowUpDate: new Date("2025-01-03T00:00:00.000Z"),
          followUpNote: "Check in",
          followUpPriority: "high",
          followUpStatus: "pending",
          isArchived: false,
          archivedAt: null,
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
          assignedOwnerUserId: null,
          nextFollowUpDate: null,
          followUpNote: null,
          followUpPriority: "medium",
          followUpStatus: "pending",
          isArchived: false,
          archivedAt: null,
          createdAt: new Date("2025-01-02T12:00:00.000Z"),
        },
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
    expect(result.archived).toBe("active");
    expect(result.sortBy).toBe("createdAt");
    expect(result.sortDir).toBe("asc");
    expect(result.pageSize).toBe(10);
    expect(result.totalCount).toBe(13);
    expect(result.pageCount).toBe(2);
    expect(result.page).toBe(2);
    expect(result.leads).toHaveLength(2);
    expect(result.leads[0]?.createdAt).toBe("2025-01-01T10:00:00.000Z");
    expect(result.leads[0]?.owner?.name).toBe("Jane Owner");
    expect(result.leads[1]?.owner).toBeNull();
    expect(result.sourceOptions).toEqual([
      { label: "Referral", count: 8 },
      { label: "Unspecified", count: 5 },
    ]);
  });
});
