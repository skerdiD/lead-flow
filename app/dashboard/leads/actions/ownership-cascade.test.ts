import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireUserIdMock,
  workspaceMock,
  protectionMock,
  selectResults,
  updateResults,
  updateValues,
  executeMutationMock,
  activityMock,
  auditMock,
  rollbackState,
  dbMock,
} = vi.hoisted(() => {
  const state = {
    requireUserIdMock: vi.fn(),
    workspaceMock: vi.fn(),
    protectionMock: vi.fn(),
    selectResults: [] as unknown[],
    updateResults: [] as unknown[],
    updateValues: [] as unknown[],
    executeMutationMock: vi.fn(),
    activityMock: vi.fn(),
    auditMock: vi.fn(),
    rollbackState: { rolledBack: false },
    dbMock: { select: vi.fn(), update: vi.fn() },
  };
  return state;
});

function selectBuilder(result: unknown) {
  const builder = {
    from: vi.fn(() => builder),
    where: vi.fn(() => builder),
    for: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return builder;
}

dbMock.select.mockImplementation(() => selectBuilder(selectResults.shift() ?? []));
dbMock.update.mockImplementation(() => {
  const result = updateResults.shift() ?? [];
  const builder = {
    set: vi.fn((value: unknown) => {
      updateValues.push(value);
      return builder;
    }),
    where: vi.fn(() => builder),
    returning: vi.fn(async () => result),
  };
  return builder;
});

vi.mock("@/db", () => ({ db: dbMock }));
vi.mock("@/lib/auth", () => ({ requireUserId: requireUserIdMock }));
vi.mock("@/lib/workspaces", () => ({ getCurrentWorkspace: workspaceMock }));
vi.mock("@/app/dashboard/leads/actions/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/dashboard/leads/actions/shared")>();
  return { ...actual, ensureLeadMutationAllowed: protectionMock, revalidateLeadPaths: vi.fn() };
});
vi.mock("@/lib/request-context.server", () => ({ getRequestId: vi.fn(async () => "request_12345678") }));
vi.mock("@/lib/audit-log.server", () => ({ writeAuditEvent: auditMock }));
vi.mock("@/app/dashboard/leads/services/activity-service", () => ({ createLeadActivity: activityMock }));
vi.mock("@/lib/idempotency.server", () => ({
  IdempotencyConflictError: class IdempotencyConflictError extends Error {},
  getIdempotentReplay: vi.fn(async () => undefined),
  executeIdempotentMutation: executeMutationMock,
}));

import { updateLeadOwnerAction } from "./ownership";

const leadId = "11111111-1111-4111-8111-111111111111";
const accountId = "22222222-2222-4222-8222-222222222222";
const contactId = "33333333-3333-4333-8333-333333333333";

function queueCascade({ account = true, contact = true }: { account?: boolean; contact?: boolean } = {}) {
  const lead = {
    id: leadId,
    fullName: "Ada Lovelace",
    assignedOwnerUserId: "owner_a",
    accountId: account ? accountId : null,
    primaryContactId: contact ? contactId : null,
  };
  selectResults.push(
    [lead],
    [{ userId: "owner_b" }],
    [{ userId: "owner_b" }],
    [lead],
    [{ id: "deal_123" }],
    ...(account ? [[{ id: accountId }]] : []),
    ...(contact ? [[{ id: contactId }]] : []),
  );
}

describe("updateLeadOwnerAction ownership cascade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults.length = 0;
    updateResults.length = 0;
    updateValues.length = 0;
    rollbackState.rolledBack = false;
    requireUserIdMock.mockResolvedValue("admin_user");
    workspaceMock.mockResolvedValue({ id: "workspace_active", name: "Active", role: "admin" });
    protectionMock.mockResolvedValue({ ok: true });
    activityMock.mockResolvedValue(undefined);
    auditMock.mockResolvedValue(undefined);
    executeMutationMock.mockImplementation(async (
      _scope: unknown,
      mutation: (tx: typeof dbMock) => Promise<{ response: unknown }>,
    ) => {
      try {
        const result = await mutation(dbMock);
        return { value: result.response, replayed: false };
      } catch (error) {
        rollbackState.rolledBack = true;
        throw error;
      }
    });
  });

  it("updates the lead and each directly linked CRM record to the new owner", async () => {
    queueCascade();
    updateResults.push([{ id: leadId }], [{ id: "deal_123" }], [{ id: accountId }], [{ id: contactId }]);

    await expect(updateLeadOwnerAction(leadId, "owner_b")).resolves.toMatchObject({ success: true });

    expect(updateValues).toContainEqual(expect.objectContaining({ assignedOwnerUserId: "owner_b" }));
    expect(updateValues).toContainEqual(expect.objectContaining({ ownerUserId: "owner_b" }));
    expect(updateValues.filter((value) => (value as Record<string, unknown>).assignedOwnerUserId === "owner_b")).toHaveLength(3);
  });

  it("allows reassignment when a lead has no account or contact", async () => {
    queueCascade({ account: false, contact: false });
    updateResults.push([{ id: leadId }], [{ id: "deal_123" }]);

    await expect(updateLeadOwnerAction(leadId, "owner_b")).resolves.toMatchObject({ success: true });
    expect(updateValues).toHaveLength(2);
  });

  it("rejects a target owner who is not a member of the active workspace", async () => {
    selectResults.push([{ id: leadId, fullName: "Ada", assignedOwnerUserId: "owner_a", accountId: null, primaryContactId: null }], []);

    await expect(updateLeadOwnerAction(leadId, "outside_user")).resolves.toEqual({
      success: false,
      message: "Choose a valid workspace member.",
    });
    expect(updateValues).toHaveLength(0);
  });

  it("rolls back the ownership transaction when a linked update fails", async () => {
    queueCascade({ contact: false });
    updateResults.push([{ id: leadId }], [{ id: "deal_123" }], []);

    await expect(updateLeadOwnerAction(leadId, "owner_b")).resolves.toEqual({
      success: false,
      message: "We couldn't update the lead owner right now. Please try again.",
    });
    expect(rollbackState.rolledBack).toBe(true);
    expect(activityMock).not.toHaveBeenCalled();
  });
});
