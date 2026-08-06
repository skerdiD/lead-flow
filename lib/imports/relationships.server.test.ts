import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  eq: vi.fn((column: unknown, value: unknown) => ({ column, value })),
  results: [] as unknown[][],
}));

vi.mock("server-only", () => ({}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions: unknown[]) => ({ conditions })),
  eq: mocks.eq,
}));
vi.mock("@/db/schema", () => ({
  accounts: { id: "account_id", workspaceId: "account_workspace", isArchived: "account_archived" },
  contacts: { id: "contact_id", workspaceId: "contact_workspace", isArchived: "contact_archived" },
  workspaceMembers: { userId: "member_user", workspaceId: "member_workspace" },
}));

import { assertImportRowRelationships } from "@/lib/imports/relationships.server";

function client() {
  return {
    select: vi.fn(() => {
      const result = mocks.results.shift() ?? [];
      const builder = {
        from: vi.fn(() => builder),
        where: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        then: (
          onFulfilled: (value: unknown[]) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) => Promise.resolve(result).then(onFulfilled, onRejected),
      };
      return builder;
    }),
  };
}

describe("import confirmation relationship authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.results.length = 0;
  });

  it("rejects modified relationship IDs and scopes every lookup to the server-owned workspace", async () => {
    mocks.results.push([], [], []);

    await expect(
      assertImportRowRelationships(client() as never, "workspace-active", {
        assignedOwnerUserId: "outside-owner",
        accountId: "22222222-2222-4222-8222-222222222222",
        primaryContactId: "33333333-3333-4333-8333-333333333333",
      }),
    ).rejects.toThrow("An import relationship is no longer available.");

    expect(mocks.eq).toHaveBeenCalledWith("member_workspace", "workspace-active");
    expect(mocks.eq).toHaveBeenCalledWith("account_workspace", "workspace-active");
    expect(mocks.eq).toHaveBeenCalledWith("contact_workspace", "workspace-active");
  });

  it("accepts relationships only when every active-workspace lookup resolves", async () => {
    mocks.results.push([{ userId: "owner" }], [{ id: "account" }], [{ id: "contact" }]);

    await expect(
      assertImportRowRelationships(client() as never, "workspace-active", {
        assignedOwnerUserId: "owner",
        accountId: "22222222-2222-4222-8222-222222222222",
        primaryContactId: "33333333-3333-4333-8333-333333333333",
      }),
    ).resolves.toBeUndefined();
  });
});
