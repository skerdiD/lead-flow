import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireUserIdMock,
  workspaceMock,
  protectionMock,
  requestIdMock,
  revalidateMock,
  reportErrorMock,
  auditMock,
  selectResults,
  insertResults,
  insertValues,
  updateResults,
  updateValues,
  transactionMock,
  dbMock,
} = vi.hoisted(() => ({
  requireUserIdMock: vi.fn(),
  workspaceMock: vi.fn(),
  protectionMock: vi.fn(),
  requestIdMock: vi.fn(),
  revalidateMock: vi.fn(),
  reportErrorMock: vi.fn(),
  auditMock: vi.fn(),
  selectResults: [] as unknown[],
  insertResults: new Map<string, unknown>(),
  insertValues: new Map<string, unknown[]>(),
  updateResults: [] as unknown[],
  updateValues: [] as unknown[],
  transactionMock: vi.fn(),
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}));

function tableName(table: object) {
  return (table as Record<symbol, string>)[Symbol.for("drizzle:Name")];
}

function selectBuilder(result: unknown) {
  const builder = {
    from: vi.fn(() => builder),
    leftJoin: vi.fn(() => builder),
    where: vi.fn(() => builder),
    orderBy: vi.fn(() => builder),
    for: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (
      onFulfilled: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return builder;
}

const mockDb = dbMock;
mockDb.select.mockImplementation(() => selectBuilder(selectResults.shift() ?? []));
mockDb.insert.mockImplementation((table: object) => {
    const name = tableName(table);
    const builder = {
      values: vi.fn((value: unknown) => {
        insertValues.set(name, [...(insertValues.get(name) ?? []), value]);
        return builder;
      }),
      onConflictDoNothing: vi.fn(() => builder),
      returning: vi.fn(async () => {
        const result = insertResults.get(name);
        if (result instanceof Error) throw result;
        return result ?? [];
      }),
      then: (
        onFulfilled: (value: unknown) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => Promise.resolve(insertResults.get(name)).then(onFulfilled, onRejected),
    };
    return builder;
  });
mockDb.update.mockImplementation(() => {
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
mockDb.transaction = transactionMock;

vi.mock("@/db", () => ({ db: dbMock }));
vi.mock("@/lib/auth", () => ({ requireUserId: requireUserIdMock }));
vi.mock("@/lib/workspaces", () => ({ getCurrentWorkspace: workspaceMock }));
vi.mock("@/app/dashboard/leads/actions/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/dashboard/leads/actions/shared")>();
  return {
    ...actual,
    ensureLeadMutationAllowed: protectionMock,
    revalidateLeadPaths: revalidateMock,
  };
});
vi.mock("@/lib/request-context.server", () => ({ getRequestId: requestIdMock }));
vi.mock("@/lib/error-reporting.server", () => ({ reportUnexpectedError: reportErrorMock }));
vi.mock("@/lib/audit-log.server", () => ({ writeAuditEvent: auditMock }));

import { qualifyLeadAction } from "@/app/dashboard/leads/actions/qualification";

const leadId = "11111111-1111-4111-8111-111111111111";
const accountId = "22222222-2222-4222-8222-222222222222";
const contactId = "33333333-3333-4333-8333-333333333333";
const dealId = "44444444-4444-4444-8444-444444444444";

const baseInput = {
  requestKey: "55555555-5555-4555-8555-555555555555",
  accountMode: "new" as const,
  accountName: "Acme GmbH",
  contactMode: "new" as const,
  contactName: "Ada Lovelace",
  contactEmail: "ada@example.com",
  contactPhone: "+49 30 123456",
  contactTitle: "CTO",
  acknowledgeContactDuplicate: false,
  dealName: "Acme platform rollout",
  dealValue: 12500,
  dealCurrency: "EUR" as const,
  dealStage: "qualified" as const,
  dealProbability: 60,
  expectedCloseDate: "2026-10-15",
  ownerUserId: "owner_user",
};

function queueNewQualification() {
  selectResults.push(
    [{ id: leadId, fullName: "Ada Lovelace", status: "Contacted", assignedOwnerUserId: "owner_user" }],
    [],
    [{ userId: "owner_user" }],
    [],
    [],
  );
  insertResults.set("accounts", [{ id: accountId }]);
  insertResults.set("contacts", [{ id: contactId }]);
  insertResults.set("deals", [{ id: dealId }]);
  updateResults.push([{ id: leadId }]);
}

describe("qualifyLeadAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults.length = 0;
    insertResults.clear();
    insertValues.clear();
    updateResults.length = 0;
    updateValues.length = 0;
    requireUserIdMock.mockResolvedValue("owner_user");
    workspaceMock.mockResolvedValue({ id: "workspace_active", name: "Active", role: "owner" });
    protectionMock.mockResolvedValue({ ok: true });
    requestIdMock.mockResolvedValue("66666666-6666-4666-8666-666666666666");
    auditMock.mockResolvedValue(undefined);
    transactionMock.mockImplementation(async (callback: (tx: typeof mockDb) => unknown) => callback(mockDb));
  });

  it("qualifies with a new account and contact and creates every relationship", async () => {
    queueNewQualification();

    const result = await qualifyLeadAction(leadId, baseInput);

    expect(result).toMatchObject({ success: true, reused: false, accountId, contactId, dealId });
    expect(insertValues.get("accounts")?.[0]).toMatchObject({ workspaceId: "workspace_active", name: "Acme GmbH", assignedOwnerUserId: "owner_user" });
    expect(insertValues.get("contacts")?.[0]).toMatchObject({ workspaceId: "workspace_active", accountId, fullName: "Ada Lovelace", title: "CTO" });
    expect(insertValues.get("deals")?.[0]).toMatchObject({ workspaceId: "workspace_active", leadId, accountId, contactId, ownerUserId: "owner_user", valueCents: 1250000 });
    expect(updateValues).toContainEqual(expect.objectContaining({ accountId, primaryContactId: contactId, assignedOwnerUserId: "owner_user", status: "Interested" }));
  });

  it("qualifies using existing account and contact without creating duplicates", async () => {
    selectResults.push(
      [{ id: leadId, fullName: "Ada Lovelace", status: "New", assignedOwnerUserId: "owner_user" }],
      [],
      [{ userId: "owner_user" }],
      [{ id: accountId, name: "Existing account" }],
      [{ id: contactId, accountId }],
    );
    insertResults.set("deals", [{ id: dealId }]);
    updateResults.push([{ id: leadId }]);

    const result = await qualifyLeadAction(leadId, {
      ...baseInput,
      accountMode: "existing",
      accountId,
      accountName: undefined,
      contactMode: "existing",
      contactId,
      contactName: undefined,
    });

    expect(result).toMatchObject({ success: true, accountId, contactId, dealId });
    expect(insertValues.has("accounts")).toBe(false);
    expect(insertValues.has("contacts")).toBe(false);
  });

  it("rejects an unauthorized member before any writes", async () => {
    workspaceMock.mockResolvedValue({ id: "workspace_active", name: "Active", role: "member" });
    selectResults.push([]);

    const result = await qualifyLeadAction(leadId, { ...baseInput, ownerUserId: "other_user" });

    expect(result).toMatchObject({ success: false, code: "conflict" });
    expect(insertValues.size).toBe(0);
  });

  it("rejects a cross-workspace account selection", async () => {
    selectResults.push(
      [{ id: leadId, fullName: "Ada", status: "New", assignedOwnerUserId: "owner_user" }],
      [],
      [{ userId: "owner_user" }],
      [],
    );

    const result = await qualifyLeadAction(leadId, { ...baseInput, accountMode: "existing", accountId, accountName: undefined });
    expect(result).toMatchObject({ success: false, code: "conflict" });
    expect(insertValues.size).toBe(0);
  });

  it("rejects a cross-workspace contact selection", async () => {
    selectResults.push(
      [{ id: leadId, fullName: "Ada", status: "New", assignedOwnerUserId: "owner_user" }],
      [],
      [{ userId: "owner_user" }],
      [{ id: accountId, name: "Existing" }],
      [],
    );
    const result = await qualifyLeadAction(leadId, { ...baseInput, accountMode: "existing", accountId, accountName: undefined, contactMode: "existing", contactId, contactName: undefined });
    expect(result).toMatchObject({ success: false, code: "conflict" });
    expect(insertValues.size).toBe(0);
  });

  it("rejects a cross-workspace owner assignment", async () => {
    selectResults.push(
      [{ id: leadId, fullName: "Ada", status: "New", assignedOwnerUserId: "owner_user" }],
      [],
      [],
    );
    const result = await qualifyLeadAction(leadId, { ...baseInput, ownerUserId: "outside_user" });
    expect(result).toMatchObject({ success: false, code: "conflict" });
    expect(insertValues.size).toBe(0);
  });

  it("safely reuses the result of a repeated qualification", async () => {
    selectResults.push(
      [{ id: leadId, fullName: "Ada", status: "Interested", assignedOwnerUserId: "owner_user" }],
      [{ id: dealId, accountId, contactId }],
    );
    const result = await qualifyLeadAction(leadId, baseInput);
    expect(result).toMatchObject({ success: true, reused: true, accountId, contactId, dealId });
    expect(insertValues.size).toBe(0);
  });

  it("rolls back the transaction when deal creation fails", async () => {
    queueNewQualification();
    insertResults.set("deals", new Error("database failure"));
    let rolledBack = false;
    transactionMock.mockImplementation(async (callback: (tx: typeof mockDb) => unknown) => {
      try {
        return await callback(mockDb);
      } catch (error) {
        rolledBack = true;
        throw error;
      }
    });

    const result = await qualifyLeadAction(leadId, baseInput);
    expect(result).toMatchObject({ success: false, message: expect.stringContaining("No changes were saved") });
    expect(rolledBack).toBe(true);
    expect(auditMock).not.toHaveBeenCalled();
    expect(insertValues.has("activity_events")).toBe(false);
  });

  it("records lead_qualified activity with structured metadata", async () => {
    queueNewQualification();
    await qualifyLeadAction(leadId, baseInput);
    expect(insertValues.get("activity_events")?.[0]).toMatchObject({
      workspaceId: "workspace_active",
      userId: "owner_user",
      eventType: "lead_qualified",
      leadId,
      metadata: expect.objectContaining({ accountId, contactId, dealId, actorUserId: "owner_user" }),
    });
  });

  it("records an idempotent qualification audit event inside the transaction", async () => {
    queueNewQualification();
    await qualifyLeadAction(leadId, baseInput);
    expect(auditMock).toHaveBeenCalledWith(expect.objectContaining({
      tx: mockDb,
      workspaceId: "workspace_active",
      action: "lead.qualified",
      entity: { type: "lead", id: leadId },
      eventKey: `lead-qualified:${leadId}`,
      metadata: expect.objectContaining({ accountId, contactId, dealId }),
    }));
  });
});
