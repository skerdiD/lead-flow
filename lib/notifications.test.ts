import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireUserIdMock,
  getCurrentWorkspaceMock,
  selectResults,
  whereConditions,
  updateWhereConditions,
  updateReturningMock,
  eqMock,
  isNullMock,
  notificationsTable,
  workspaceMembersTable,
  insertValuesMock,
  onConflictDoNothingMock,
  insertReturningMock,
} = vi.hoisted(() => ({
  requireUserIdMock: vi.fn(),
  getCurrentWorkspaceMock: vi.fn(),
  selectResults: [] as unknown[],
  whereConditions: [] as unknown[],
  updateWhereConditions: [] as unknown[],
  updateReturningMock: vi.fn(),
  eqMock: vi.fn((column: string, value: unknown) => ({
    kind: "eq",
    column,
    value,
  })),
  isNullMock: vi.fn((column: string) => ({ kind: "isNull", column })),
  notificationsTable: {
    id: "notifications.id",
    workspaceId: "notifications.workspace_id",
    userId: "notifications.user_id",
    type: "notifications.type",
    title: "notifications.title",
    message: "notifications.message",
    actionUrl: "notifications.action_url",
    readAt: "notifications.read_at",
    createdAt: "notifications.created_at",
    metadata: "notifications.metadata",
    dedupeKey: "notifications.dedupe_key",
  },
  workspaceMembersTable: {
    id: "workspace_members.id",
    workspaceId: "workspace_members.workspace_id",
    userId: "workspace_members.user_id",
  },
  insertValuesMock: vi.fn(),
  onConflictDoNothingMock: vi.fn(),
  insertReturningMock: vi.fn(),
}));

function createSelectBuilder(result: unknown) {
  const builder = {
    from: vi.fn(() => builder),
    where: vi.fn((condition: unknown) => {
      whereConditions.push(condition);
      return builder;
    }),
    orderBy: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (
      onFulfilled: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };

  return builder;
}

vi.mock("server-only", () => ({}));

vi.mock("drizzle-orm", () => ({
  and: (...conditions: unknown[]) => conditions,
  count: () => "count",
  desc: (column: string) => ({ kind: "desc", column }),
  eq: eqMock,
  isNull: isNullMock,
}));

vi.mock("@/db/schema", () => ({
  notifications: notificationsTable,
  workspaceMembers: workspaceMembersTable,
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => createSelectBuilder(selectResults.shift() ?? [])),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn((condition: unknown) => {
          updateWhereConditions.push(condition);
          return {
            returning: updateReturningMock,
            then: (onFulfilled: (value: unknown) => unknown) =>
              Promise.resolve(undefined).then(onFulfilled),
          };
        }),
      })),
    })),
    insert: vi.fn(() => ({ values: insertValuesMock })),
  },
}));

vi.mock("@/lib/auth", () => ({ requireUserId: requireUserIdMock }));
vi.mock("@/lib/workspaces", () => ({
  getCurrentWorkspace: getCurrentWorkspaceMock,
}));

import {
  createNotification,
  getNotificationDropdownData,
  getUnreadNotificationCount,
  markAllNotificationsAsReadForCurrentUser,
  markNotificationAsReadForCurrentUser,
} from "@/lib/notifications";

const notificationId = "11111111-1111-4111-8111-111111111111";

describe("notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults.length = 0;
    whereConditions.length = 0;
    updateWhereConditions.length = 0;
    requireUserIdMock.mockResolvedValue("user_current");
    getCurrentWorkspaceMock.mockResolvedValue({ id: "workspace_current" });
    updateReturningMock.mockResolvedValue([{ id: notificationId }]);
    insertValuesMock.mockImplementation(() => ({
      onConflictDoNothing: onConflictDoNothingMock,
    }));
    onConflictDoNothingMock.mockImplementation(() => ({
      returning: insertReturningMock,
    }));
    insertReturningMock.mockResolvedValue([{ id: notificationId }]);
  });

  it("fetches recent notifications only for the authenticated user in the active workspace", async () => {
    selectResults.push(
      [
        {
          id: notificationId,
          type: "task_due",
          title: "Task due today",
          message: "Call Acme is due today.",
          actionUrl: "/dashboard/leads/11111111-1111-4111-8111-111111111111",
          readAt: null,
          createdAt: new Date("2026-07-15T08:00:00.000Z"),
        },
      ],
      [{ count: "1" }],
    );

    const result = await getNotificationDropdownData();

    expect(result.unreadCount).toBe(1);
    expect(result.notifications).toHaveLength(1);
    expect(whereConditions[0]).toEqual([
      { kind: "eq", column: "notifications.workspace_id", value: "workspace_current" },
      { kind: "eq", column: "notifications.user_id", value: "user_current" },
    ]);
  });

  it("counts only unread notifications", async () => {
    selectResults.push([{ count: "4" }]);

    await expect(getUnreadNotificationCount()).resolves.toBe(4);
    expect(whereConditions[0]).toEqual([
      { kind: "eq", column: "notifications.workspace_id", value: "workspace_current" },
      { kind: "eq", column: "notifications.user_id", value: "user_current" },
      { kind: "isNull", column: "notifications.read_at" },
    ]);
    expect(isNullMock).toHaveBeenCalledWith("notifications.read_at");
  });

  it("marks one current-user notification as read and returns the refreshed unread count", async () => {
    selectResults.push([{ count: "2" }]);

    await expect(markNotificationAsReadForCurrentUser(notificationId)).resolves.toEqual({
      success: true,
      unreadCount: 2,
    });
    expect(updateWhereConditions[0]).toEqual([
      { kind: "eq", column: "notifications.id", value: notificationId },
      { kind: "eq", column: "notifications.workspace_id", value: "workspace_current" },
      { kind: "eq", column: "notifications.user_id", value: "user_current" },
      { kind: "isNull", column: "notifications.read_at" },
    ]);
  });

  it("does not let a user mark another user’s notification as read", async () => {
    updateReturningMock.mockResolvedValue([]);

    await expect(markNotificationAsReadForCurrentUser(notificationId)).resolves.toEqual({
      success: false,
      message: "This notification is no longer available.",
    });
    expect(updateWhereConditions[0]).toEqual(
      expect.arrayContaining([
        { kind: "eq", column: "notifications.user_id", value: "user_current" },
        { kind: "eq", column: "notifications.workspace_id", value: "workspace_current" },
      ]),
    );
  });

  it("marks all unread notifications only within the current user’s active workspace", async () => {
    await expect(markAllNotificationsAsReadForCurrentUser()).resolves.toEqual({
      success: true,
      unreadCount: 0,
    });
    expect(updateWhereConditions[0]).toEqual([
      { kind: "eq", column: "notifications.workspace_id", value: "workspace_current" },
      { kind: "eq", column: "notifications.user_id", value: "user_current" },
      { kind: "isNull", column: "notifications.read_at" },
    ]);
  });

  it("uses the database uniqueness key to deduplicate automatic notifications", async () => {
    selectResults.push([{ id: "membership_123" }]);

    await expect(
      createNotification({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        userId: "user_current",
        type: "task_overdue",
        title: "Task overdue",
        message: "Call Acme is past its due date.",
        actionUrl: "/dashboard/leads/11111111-1111-4111-8111-111111111111",
        metadata: { entityType: "task", entityId: notificationId },
        dedupeKey: `task_overdue:${notificationId}`,
      }),
    ).resolves.toEqual({ created: true, id: notificationId });

    expect(onConflictDoNothingMock).toHaveBeenCalledWith({
      target: [
        "notifications.workspace_id",
        "notifications.user_id",
        "notifications.dedupe_key",
      ],
    });
  });
});
