import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authorizationContextMock,
  memberOptionsMock,
  selectResults,
  builders,
} = vi.hoisted(() => ({
  authorizationContextMock: vi.fn(),
  memberOptionsMock: vi.fn(),
  selectResults: [] as unknown[],
  builders: [] as Array<{ where: ReturnType<typeof vi.fn> }>,
}));

function createSelectBuilder(result: unknown) {
  const builder = {
    from: vi.fn(() => builder),
    leftJoin: vi.fn(() => builder),
    where: vi.fn(() => builder),
    orderBy: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (
      onFulfilled: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };
  builders.push(builder);
  return builder;
}

function predicateContains(root: unknown, expected: string) {
  const queue: unknown[] = [root];
  const seen = new WeakSet<object>();

  while (queue.length) {
    const value = queue.shift();
    if (value === expected) return true;
    if (!value || typeof value !== "object" || seen.has(value)) continue;
    seen.add(value);
    queue.push(...Object.values(value));
  }

  return false;
}

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => createSelectBuilder(selectResults.shift() ?? [])),
  },
}));

vi.mock("@/lib/authorization", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/authorization")>();
  return {
    ...actual,
    getCurrentWorkspaceAuthorizationContext: authorizationContextMock,
  };
});

vi.mock("@/lib/workspace-member-profiles.server", () => ({
  getWorkspaceMemberOptions: memberOptionsMock,
}));

import { db } from "@/db";
import { getLeadDetails } from "@/app/dashboard/leads/[id]/queries";

const leadId = "11111111-1111-4111-8111-111111111111";
const createdAt = new Date("2026-01-01T09:00:00.000Z");
const updatedAt = new Date("2026-01-03T10:00:00.000Z");

function leadRow(overrides: Record<string, unknown> = {}) {
  return {
    id: leadId,
    fullName: "Ada Lovelace",
    company: "Analytical Engines",
    email: "ada@example.com",
    phone: "+44 20 0000 0000",
    status: "Contacted",
    source: "Referral",
    notes: "Interested in the enterprise plan.",
    nextFollowUpDate: new Date("2026-01-10T00:00:00.000Z"),
    followUpNote: "Review technical requirements",
    followUpPriority: "high",
    followUpStatus: "pending",
    isArchived: false,
    archivedAt: null,
    assignedOwnerUserId: "user_owner",
    accountId: "22222222-2222-4222-8222-222222222222",
    accountName: "Analytical Engines",
    primaryContactId: "33333333-3333-4333-8333-333333333333",
    primaryContactName: "Ada Lovelace",
    primaryContactEmail: "ada@example.com",
    primaryContactPhone: "+44 20 0000 0000",
    jobTitle: "Founder",
    createdAt,
    updatedAt,
    ...overrides,
  };
}

describe("getLeadDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults.length = 0;
    builders.length = 0;
    authorizationContextMock.mockResolvedValue({
      workspaceId: "workspace_active",
      userId: "user_owner",
      role: "owner",
    });
    memberOptionsMock.mockResolvedValue([
      { userId: "user_owner", name: "Ada Owner", imageUrl: null },
    ]);
  });

  it("returns the complete lead entity to an authorized workspace member", async () => {
    selectResults.push(
      [leadRow()],
      [{ id: "note_1", content: "Decision maker confirmed", userId: "user_owner", createdAt, updatedAt }],
      [{ id: "activity_1", eventType: "lead_created", message: "Lead created", createdAt }],
      [{ id: "task_1", title: "Send proposal", description: null, dueAt: updatedAt, status: "pending", priority: "high", completedAt: null, createdAt, updatedAt }],
      [{ id: "deal_1", name: "Enterprise plan", stage: "qualified", valueCents: 1200000, currency: "USD", probability: 60, expectedCloseAt: null, closedAt: null, lostReason: null, createdAt, updatedAt }],
    );

    const result = await getLeadDetails(leadId);

    expect(result).toMatchObject({
      id: leadId,
      fullName: "Ada Lovelace",
      jobTitle: "Founder",
      owner: { userId: "user_owner", name: "Ada Owner" },
      accountName: "Analytical Engines",
      primaryContactName: "Ada Lovelace",
    });
    expect(result?.noteEntries).toHaveLength(1);
    expect(result?.activityEntries).toHaveLength(1);
    expect(result?.taskEntries).toHaveLength(1);
    expect(result?.dealEntry?.name).toBe("Enterprise plan");
  });

  it("returns the same not-found result for an unknown or cross-workspace lead", async () => {
    selectResults.push([]);
    await expect(getLeadDetails(leadId)).resolves.toBeNull();
    expect(db.select).toHaveBeenCalledTimes(1);
    expect(memberOptionsMock).not.toHaveBeenCalled();

    vi.clearAllMocks();
    selectResults.push([]);
    authorizationContextMock.mockResolvedValue({
      workspaceId: "workspace_other",
      userId: "user_other",
      role: "owner",
    });
    await expect(getLeadDetails(leadId)).resolves.toBeNull();
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("scopes the root and every related query to the active workspace and lead", async () => {
    selectResults.push([leadRow()], [], [], [], []);

    await getLeadDetails(leadId);

    expect(builders).toHaveLength(5);
    for (const builder of builders) {
      const predicate = builder.where.mock.calls[0];
      expect(predicateContains(predicate, "workspace_active")).toBe(true);
      expect(predicateContains(predicate, leadId)).toBe(true);
    }
  });

  it("does not query the database for a malformed lead id", async () => {
    await expect(getLeadDetails("not-an-id")).resolves.toBeNull();
    expect(db.select).not.toHaveBeenCalled();
    expect(authorizationContextMock).not.toHaveBeenCalled();
  });
});
