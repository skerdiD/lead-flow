import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  accountTable,
  contactTable,
  updateConditionsMock,
  insertValues,
  updateResults,
} = vi.hoisted(() => ({
  accountTable: {
    id: "account_id",
    workspaceId: "account_workspace_id",
    assignedOwnerUserId: "account_owner_user_id",
    userId: "account_user_id",
    name: "account_name",
    updatedAt: "account_updated_at",
  },
  contactTable: {
    id: "contact_id",
    workspaceId: "contact_workspace_id",
    assignedOwnerUserId: "contact_owner_user_id",
    userId: "contact_user_id",
    accountId: "contact_account_id",
    fullName: "contact_full_name",
    email: "contact_email",
    phone: "contact_phone",
    updatedAt: "contact_updated_at",
  },
  updateConditionsMock: vi.fn(() => []),
  insertValues: [] as unknown[],
  updateResults: [] as unknown[],
}));

vi.mock("@/db/schema", () => ({ accounts: accountTable, contacts: contactTable }));
vi.mock("@/lib/authorization", () => ({
  getRecordUpdateConditions: updateConditionsMock,
}));
vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(() => {
      const builder = {
        values: vi.fn((value: unknown) => {
          insertValues.push(value);
          return builder;
        }),
        returning: vi.fn(async () => updateResults.shift() ?? []),
      };
      return builder;
    }),
    update: vi.fn(() => {
      const builder = {
        set: vi.fn(() => builder),
        where: vi.fn(() => builder),
        returning: vi.fn(async () => updateResults.shift() ?? []),
      };
      return builder;
    }),
  },
}));

import { saveLeadAccount, saveLeadContact } from "./contact-account-service";

const context = {
  workspaceId: "workspace_active",
  userId: "editor_user",
  role: "member" as const,
};

describe("lead account/contact persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertValues.length = 0;
    updateResults.length = 0;
  });

  it("assigns the lead owner when it creates an account", async () => {
    updateResults.push([{ id: "account_123" }]);

    await saveLeadAccount({
      workspaceId: context.workspaceId,
      userId: context.userId,
      ownerUserId: "lead_owner",
      authorizationContext: context,
      company: "Acme GmbH",
    });

    expect(insertValues).toContainEqual(expect.objectContaining({
      workspaceId: context.workspaceId,
      assignedOwnerUserId: "lead_owner",
      name: "Acme GmbH",
    }));
  });

  it("assigns the lead owner when it creates a contact", async () => {
    updateResults.push([{ id: "contact_123" }]);

    await saveLeadContact({
      workspaceId: context.workspaceId,
      userId: context.userId,
      ownerUserId: "lead_owner",
      authorizationContext: context,
      accountId: "account_123",
      fullName: "Ada Lovelace",
    });

    expect(insertValues).toContainEqual(expect.objectContaining({
      workspaceId: context.workspaceId,
      assignedOwnerUserId: "lead_owner",
      accountId: "account_123",
      fullName: "Ada Lovelace",
    }));
  });

  it("uses record-level authorization for existing linked records", async () => {
    updateResults.push([{ id: "account_123" }], [{ id: "contact_123" }]);

    await saveLeadAccount({
      workspaceId: context.workspaceId,
      userId: context.userId,
      ownerUserId: "lead_owner",
      authorizationContext: context,
      existingAccountId: "account_123",
      company: "Acme GmbH",
    });
    await saveLeadContact({
      workspaceId: context.workspaceId,
      userId: context.userId,
      ownerUserId: "lead_owner",
      authorizationContext: context,
      existingContactId: "contact_123",
      fullName: "Ada Lovelace",
    });

    expect(updateConditionsMock).toHaveBeenCalledWith(
      context,
      accountTable.workspaceId,
      accountTable.assignedOwnerUserId,
    );
    expect(updateConditionsMock).toHaveBeenCalledWith(
      context,
      contactTable.workspaceId,
      contactTable.assignedOwnerUserId,
    );
  });

  it("does not create a replacement record when an existing linked record is unauthorized", async () => {
    updateResults.push([]);

    await expect(saveLeadAccount({
      workspaceId: context.workspaceId,
      userId: context.userId,
      ownerUserId: "lead_owner",
      authorizationContext: context,
      existingAccountId: "account_123",
      company: "Acme GmbH",
    })).rejects.toThrow("permission to update");

    expect(insertValues).toHaveLength(0);
  });

  it("does not create a replacement contact when an existing linked contact is unauthorized", async () => {
    updateResults.push([]);

    await expect(saveLeadContact({
      workspaceId: context.workspaceId,
      userId: context.userId,
      ownerUserId: "lead_owner",
      authorizationContext: context,
      existingContactId: "contact_123",
      fullName: "Ada Lovelace",
    })).rejects.toThrow("permission to update");

    expect(insertValues).toHaveLength(0);
  });
});
