import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorization: vi.fn(),
  select: vi.fn(),
  eq: vi.fn((column: unknown, value: unknown) => ({ column, value })),
}));

function selectBuilder(result: unknown[]) {
  const builder = {
    from: vi.fn(() => builder),
    where: vi.fn(() => builder),
    orderBy: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    offset: vi.fn(() => builder),
    then: (
      onFulfilled: (value: unknown[]) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return builder;
}

vi.mock("server-only", () => ({}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions: unknown[]) => ({ conditions })),
  desc: vi.fn((value: unknown) => value),
  eq: mocks.eq,
  ilike: vi.fn(),
  or: vi.fn(),
  sql: Object.assign(vi.fn(), {
    raw: vi.fn(),
  }),
}));
vi.mock("@/db/schema", () => ({
  auditLogs: {
    workspaceId: "workspace_id",
    createdAt: "created_at",
    action: "action",
    entityType: "entity_type",
    actorUserId: "actor_user_id",
    entityId: "entity_id",
    metadata: "metadata",
  },
}));
vi.mock("@/db", () => ({ db: { select: mocks.select } }));
vi.mock("@/lib/authorization", () => ({
  getCurrentWorkspaceAuthorizationContext: mocks.authorization,
  hasWorkspacePermission: (role: string) => role === "owner" || role === "admin",
}));

import {
  AuditLogAccessError,
  getAuthorizedAuditLogPage,
} from "@/lib/audit-log-query.server";

describe("audit-log direct query authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorization.mockResolvedValue({
      workspaceId: "workspace-active",
      userId: "admin-user",
      role: "admin",
    });
    mocks.select
      .mockImplementationOnce(() => selectBuilder([{ count: 0 }]))
      .mockImplementationOnce(() => selectBuilder([]));
  });

  it("rejects a member direct call before reading audit rows", async () => {
    mocks.authorization.mockResolvedValue({
      workspaceId: "workspace-active",
      userId: "member-user",
      role: "member",
    });

    await expect(getAuthorizedAuditLogPage()).rejects.toBeInstanceOf(
      AuditLogAccessError,
    );
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("uses only the server-authorized workspace when reading audit rows", async () => {
    await getAuthorizedAuditLogPage({ search: "workspace-attacker", page: 1 });

    expect(mocks.eq).toHaveBeenCalledWith("workspace_id", "workspace-active");
    expect(mocks.select).toHaveBeenCalledTimes(2);
  });
});
