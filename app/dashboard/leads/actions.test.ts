import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireUserIdMock,
  getCurrentWorkspaceMock,
  revalidatePathMock,
  selectResults,
  insertLeadValuesMock,
  insertLeadReturningMock,
  insertAccountValuesMock,
  insertAccountReturningMock,
  insertContactValuesMock,
  insertContactReturningMock,
  insertDealValuesMock,
  insertDealReturningMock,
  insertTaskValuesMock,
  insertActivityValuesMock,
  updateReturningMock,
  deleteReturningMock,
  protectLeadMutationMock,
  leadsTable,
  accountsTable,
  activityEventsTable,
  contactsTable,
  dealsTable,
  crmTasksTable,
  leadNotesTable,
} = vi.hoisted(() => {
  const state = {
    requireUserIdMock: vi.fn(),
    getCurrentWorkspaceMock: vi.fn(),
    revalidatePathMock: vi.fn(),
    selectResults: [] as unknown[],
    insertLeadValuesMock: vi.fn(),
    insertLeadReturningMock: vi.fn(),
    insertAccountValuesMock: vi.fn(),
    insertAccountReturningMock: vi.fn(),
    insertContactValuesMock: vi.fn(),
    insertContactReturningMock: vi.fn(),
    insertDealValuesMock: vi.fn(),
    insertDealReturningMock: vi.fn(),
    insertTaskValuesMock: vi.fn(),
    insertActivityValuesMock: vi.fn(),
    updateReturningMock: vi.fn(),
    deleteReturningMock: vi.fn(),
    protectLeadMutationMock: vi.fn(),
    leadsTable: {
      id: "id",
      workspaceId: "workspace_id",
      userId: "user_id",
      assignedOwnerUserId: "assigned_owner_user_id",
      accountId: "account_id",
      primaryContactId: "primary_contact_id",
      fullName: "full_name",
      company: "company",
      email: "email",
      phone: "phone",
      status: "status",
      source: "source",
      notes: "notes",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    accountsTable: {
      id: "id",
      workspaceId: "workspace_id",
      userId: "user_id",
      name: "name",
      updatedAt: "updated_at",
    },
    activityEventsTable: {
      id: "id",
      workspaceId: "workspace_id",
      userId: "user_id",
      eventType: "event_type",
      message: "message",
      leadId: "lead_id",
      leadName: "lead_name",
      createdAt: "created_at",
    },
    contactsTable: {
      id: "id",
      workspaceId: "workspace_id",
      userId: "user_id",
      accountId: "account_id",
      fullName: "full_name",
      email: "email",
      phone: "phone",
      updatedAt: "updated_at",
    },
    dealsTable: {
      id: "id",
      workspaceId: "workspace_id",
      userId: "user_id",
      ownerUserId: "owner_user_id",
      leadId: "lead_id",
      accountId: "account_id",
      contactId: "contact_id",
      name: "name",
      stage: "stage",
      valueCents: "value_cents",
      currency: "currency",
      probability: "probability",
      expectedCloseAt: "expected_close_at",
      closedAt: "closed_at",
      lostReason: "lost_reason",
      updatedAt: "updated_at",
    },
    crmTasksTable: {
      id: "id",
      workspaceId: "workspace_id",
      userId: "user_id",
      ownerUserId: "owner_user_id",
      leadId: "lead_id",
      dealId: "deal_id",
      contactId: "contact_id",
      title: "title",
      description: "description",
      dueAt: "due_at",
      status: "status",
      priority: "priority",
      completedAt: "completed_at",
      updatedAt: "updated_at",
    },
    leadNotesTable: {
      id: "id",
      workspaceId: "workspace_id",
      userId: "user_id",
      leadId: "lead_id",
      content: "content",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  };

  return state;
});

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
  accounts: accountsTable,
  activityEvents: activityEventsTable,
  contacts: contactsTable,
  deals: dealsTable,
  crmTasks: crmTasksTable,
  leadNotes: leadNotesTable,
}));

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn((table: unknown) => {
      if (table === leadsTable) {
        return {
          values: insertLeadValuesMock,
        };
      }

      if (table === accountsTable) {
        return {
          values: insertAccountValuesMock,
        };
      }

      if (table === contactsTable) {
        return {
          values: insertContactValuesMock,
        };
      }

      if (table === dealsTable) {
        return {
          values: insertDealValuesMock,
        };
      }

      if (table === crmTasksTable) {
        return {
          values: insertTaskValuesMock,
        };
      }

      if (table === activityEventsTable) {
        return {
          values: insertActivityValuesMock,
        };
      }

      return {
        values: vi.fn(),
      };
    }),
    select: vi.fn(() => createSelectBuilder(selectResults.shift() ?? [])),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: updateReturningMock,
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: deleteReturningMock,
      })),
    })),
  },
}));

vi.mock("@/lib/auth", () => ({
  requireUserId: requireUserIdMock,
}));

vi.mock("@/lib/workspaces", () => ({
  getCurrentWorkspace: getCurrentWorkspaceMock,
}));

vi.mock("@/lib/arcjet", () => ({
  protectLeadMutation: protectLeadMutationMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import {
  createFollowUpTaskAction,
  createLeadAction,
  deleteLeadAction,
  updateLeadAction,
} from "@/app/dashboard/leads/actions";

const validLeadInput = {
  fullName: "Jane Doe",
  company: "Acme",
  email: "jane@acme.com",
  phone: "+355691234567",
  status: "New" as const,
  source: "Referral",
  notes: "Interested in onboarding",
  dealStage: "new" as const,
  dealValue: 0,
  dealCurrency: "USD" as const,
  dealProbability: 10,
};

const leadId = "11111111-1111-4111-8111-111111111111";

describe("lead actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults.length = 0;
    requireUserIdMock.mockResolvedValue("user_123");
    getCurrentWorkspaceMock.mockResolvedValue({
      id: "workspace_123",
      name: "Personal Workspace",
      ownerUserId: "user_123",
      role: "owner",
    });
    protectLeadMutationMock.mockResolvedValue({ ok: true });

    insertLeadValuesMock.mockImplementation(() => ({
      returning: insertLeadReturningMock,
    }));
    insertAccountValuesMock.mockImplementation(() => ({
      returning: insertAccountReturningMock,
    }));
    insertContactValuesMock.mockImplementation(() => ({
      returning: insertContactReturningMock,
    }));
    insertDealValuesMock.mockImplementation(() => ({
      returning: insertDealReturningMock,
    }));
    insertTaskValuesMock.mockResolvedValue(undefined);
    insertAccountReturningMock.mockResolvedValue([{ id: "account_123" }]);
    insertContactReturningMock.mockResolvedValue([{ id: "contact_123" }]);
    insertDealReturningMock.mockResolvedValue([{ id: "deal_123", stage: "new" }]);
    insertActivityValuesMock.mockResolvedValue(undefined);
  });

  it("createLeadAction saves deal revenue fields when an opportunity is provided", async () => {
    selectResults.push([]);
    insertLeadReturningMock.mockResolvedValue([
      { id: leadId, fullName: "Jane Doe" },
    ]);

    const result = await createLeadAction({
      ...validLeadInput,
      dealName: "Website redesign",
      dealStage: "proposal",
      dealValue: 7500.5,
      dealCurrency: "EUR",
      dealProbability: 60,
      expectedCloseDate: "2026-06-15",
    });

    expect(result.success).toBe(true);
    expect(insertDealValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace_123",
        leadId,
        name: "Website redesign",
        stage: "proposal",
        valueCents: 750050,
        currency: "EUR",
        probability: 60,
        lostReason: null,
      }),
    );
    expect(insertDealValuesMock.mock.calls[0]?.[0].expectedCloseAt).toEqual(
      new Date("2026-06-15T00:00:00.000Z"),
    );
  });

  it("createLeadAction creates a lead and activity event", async () => {
    insertLeadReturningMock.mockResolvedValue([
      { id: leadId, fullName: "Jane Doe" },
    ]);

    const result = await createLeadAction(validLeadInput);

    expect(result).toEqual({
      success: true,
      leadId,
      message: "Lead created successfully.",
    });
    expect(insertActivityValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace_123",
        userId: "user_123",
        eventType: "lead_created",
        leadId,
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/leads");
    expect(insertAccountValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace_123",
        name: "Acme",
      }),
    );
    expect(insertContactValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace_123",
        accountId: "account_123",
        fullName: "Jane Doe",
      }),
    );
  });

  it("updateLeadAction updates a lead and logs status change", async () => {
    selectResults.push([
      {
        id: leadId,
        fullName: "Jane Doe",
        status: "New",
        accountId: null,
        primaryContactId: null,
        assignedOwnerUserId: null,
      },
    ]);
    updateReturningMock.mockResolvedValue([
      { id: leadId, fullName: "Jane Doe", status: "Closed" },
    ]);

    const result = await updateLeadAction(leadId, {
      ...validLeadInput,
      status: "Closed",
    });

    expect(result).toEqual({
      success: true,
      leadId,
      message: "Lead updated successfully.",
    });
    expect(insertActivityValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace_123",
        eventType: "lead_status_changed",
        leadId,
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/leads/${leadId}`);
  });

  it("createFollowUpTaskAction creates a task and logs activity", async () => {
    selectResults.push(
      [
        {
          id: leadId,
          fullName: "Jane Doe",
          primaryContactId: "contact_123",
          assignedOwnerUserId: "user_123",
        },
      ],
      [{ id: "deal_123" }],
    );

    const result = await createFollowUpTaskAction(leadId, {
      title: "Send proposal follow-up",
      description: "Confirm decision timeline",
      dueDate: "2026-06-01",
      priority: "high",
    });

    expect(result).toEqual({
      success: true,
      message: "Follow-up task created.",
    });
    expect(insertTaskValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace_123",
        leadId,
        dealId: "deal_123",
        contactId: "contact_123",
        title: "Send proposal follow-up",
        priority: "high",
      }),
    );
    expect(insertActivityValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace_123",
        eventType: "task_created",
        leadId,
      }),
    );
  });

  it("deleteLeadAction deletes a lead and logs delete activity", async () => {
    deleteReturningMock.mockResolvedValue([
      { id: leadId, fullName: "Jane Doe" },
    ]);

    const result = await deleteLeadAction(leadId);

    expect(result).toEqual({
      success: true,
      message: "Lead deleted successfully.",
    });
    expect(insertActivityValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace_123",
        eventType: "lead_deleted",
        leadId,
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/activity");
  });

  it("rejects invalid lead ids before querying the database", async () => {
    const result = await updateLeadAction("not-a-uuid", validLeadInput);

    expect(result).toEqual({
      success: false,
      message: "This lead could not be found.",
    });
    expect(protectLeadMutationMock).not.toHaveBeenCalled();
  });
});
