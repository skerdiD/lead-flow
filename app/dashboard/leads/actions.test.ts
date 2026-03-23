import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireUserIdMock,
  revalidatePathMock,
  selectResults,
  insertLeadValuesMock,
  insertLeadReturningMock,
  insertActivityValuesMock,
  updateReturningMock,
  deleteReturningMock,
  leadsTable,
  activityEventsTable,
  leadNotesTable,
} = vi.hoisted(() => {
  const state = {
    requireUserIdMock: vi.fn(),
    revalidatePathMock: vi.fn(),
    selectResults: [] as unknown[],
    insertLeadValuesMock: vi.fn(),
    insertLeadReturningMock: vi.fn(),
    insertActivityValuesMock: vi.fn(),
    updateReturningMock: vi.fn(),
    deleteReturningMock: vi.fn(),
    leadsTable: {
      id: "id",
      userId: "user_id",
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
    activityEventsTable: {
      id: "id",
      userId: "user_id",
      eventType: "event_type",
      message: "message",
      leadId: "lead_id",
      leadName: "lead_name",
      createdAt: "created_at",
    },
    leadNotesTable: {
      id: "id",
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
  activityEvents: activityEventsTable,
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

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import {
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
};

describe("lead actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults.length = 0;
    requireUserIdMock.mockResolvedValue("user_123");

    insertLeadValuesMock.mockImplementation(() => ({
      returning: insertLeadReturningMock,
    }));
    insertActivityValuesMock.mockResolvedValue(undefined);
  });

  it("createLeadAction creates a lead and activity event", async () => {
    insertLeadReturningMock.mockResolvedValue([
      { id: "lead_1", fullName: "Jane Doe" },
    ]);

    const result = await createLeadAction(validLeadInput);

    expect(result).toEqual({
      success: true,
      leadId: "lead_1",
      message: "Lead created successfully.",
    });
    expect(insertActivityValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_123",
        eventType: "lead_created",
        leadId: "lead_1",
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/leads");
  });

  it("updateLeadAction updates a lead and logs status change", async () => {
    selectResults.push([
      { id: "lead_1", fullName: "Jane Doe", status: "New" },
    ]);
    updateReturningMock.mockResolvedValue([
      { id: "lead_1", fullName: "Jane Doe", status: "Closed" },
    ]);

    const result = await updateLeadAction("lead_1", {
      ...validLeadInput,
      status: "Closed",
    });

    expect(result).toEqual({
      success: true,
      leadId: "lead_1",
      message: "Lead updated successfully.",
    });
    expect(insertActivityValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "lead_status_changed",
        leadId: "lead_1",
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/leads/lead_1");
  });

  it("deleteLeadAction deletes a lead and logs delete activity", async () => {
    deleteReturningMock.mockResolvedValue([
      { id: "lead_1", fullName: "Jane Doe" },
    ]);

    const result = await deleteLeadAction("lead_1");

    expect(result).toEqual({
      success: true,
      message: "Lead deleted successfully.",
    });
    expect(insertActivityValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "lead_deleted",
        leadId: "lead_1",
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/activity");
  });
});
