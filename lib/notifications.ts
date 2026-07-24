import "server-only";

import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  notifications,
  workspaceMembers,
} from "@/db/schema";
import {
  NOTIFICATION_TYPES,
  type NotificationType,
} from "@/lib/constants/notifications";
import type {
  NotificationDropdownData,
  NotificationListItem,
} from "@/lib/notifications-types";
import type { DatabaseClient } from "@/lib/db-client";
import { reportUnexpectedError } from "@/lib/error-reporting.server";
import { isUuid } from "@/lib/uuid";
import { requireUserId } from "@/lib/auth";
import { getCurrentWorkspace } from "@/lib/workspaces";

type NotificationDbClient = Pick<DatabaseClient, "insert" | "select">;

type NotificationMetadata = Record<string, string>;

export type CreateNotificationInput = {
  workspaceId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string | null;
  metadata?: NotificationMetadata;
  dedupeKey?: string;
  client?: NotificationDbClient;
};

export type NotificationMutationResult =
  | { success: true; unreadCount: number }
  | { success: false; message: string };

const MAX_NOTIFICATIONS_PER_DROPDOWN = 20;
const DEDUPE_KEY_PATTERN = /^[a-z0-9:_-]{1,255}$/;

function isNotificationType(value: string): value is NotificationType {
  return NOTIFICATION_TYPES.includes(value as NotificationType);
}

function isSafeActionUrl(value: string) {
  return (
    value.startsWith("/dashboard/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    value.length <= 255
  );
}

function isSafeMetadata(value: NotificationMetadata | undefined) {
  if (!value) return true;

  return Object.entries(value).every(
    ([key, entry]) =>
      key.length > 0 &&
      key.length <= 64 &&
      /^[a-zA-Z][a-zA-Z0-9_]*$/.test(key) &&
      typeof entry === "string" &&
      entry.length <= 255,
  );
}

function isValidNotificationInput(input: CreateNotificationInput) {
  return (
    isUuid(input.workspaceId) &&
    input.userId.trim().length > 0 &&
    input.userId.length <= 255 &&
    isNotificationType(input.type) &&
    input.title.trim().length > 0 &&
    input.title.length <= 160 &&
    input.message.trim().length > 0 &&
    input.message.length <= 255 &&
    (!input.actionUrl || isSafeActionUrl(input.actionUrl)) &&
    (!input.dedupeKey || DEDUPE_KEY_PATTERN.test(input.dedupeKey)) &&
    isSafeMetadata(input.metadata)
  );
}

/** Low-level notification insert with recipient validation and deduplication. */
export async function createNotification(input: CreateNotificationInput) {
  if (!isValidNotificationInput(input)) {
    throw new Error("Invalid notification input.");
  }

  const client = input.client ?? db;
  const [membership] = await client
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, input.workspaceId),
        eq(workspaceMembers.userId, input.userId),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new Error("Notification recipient is not a workspace member.");
  }

  const [createdNotification] = await client
    .insert(notifications)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      type: input.type,
      title: input.title.trim(),
      message: input.message.trim(),
      actionUrl: input.actionUrl ?? null,
      metadata: input.metadata ?? null,
      dedupeKey: input.dedupeKey,
    })
    .onConflictDoNothing({
      target: [
        notifications.workspaceId,
        notifications.userId,
        notifications.dedupeKey,
      ],
    })
    .returning({ id: notifications.id });

  return {
    created: Boolean(createdNotification),
    id: createdNotification?.id ?? null,
  };
}

/**
 * Attempts a non-critical in-app notification after the domain transaction
 * commits. Failure is observable but never changes the completed mutation's
 * user-visible result. The call is awaited; this is not fire-and-forget work.
 */
export async function createNotificationBestEffort(
  input: Omit<CreateNotificationInput, "client">,
  context: {
    requestId?: string;
    operation: string;
    entityType: string;
    entityId?: string;
  },
) {
  try {
    return await createNotification(input);
  } catch (error) {
    await reportUnexpectedError(error, {
      event: "notification.create.failed",
      requestId: context.requestId,
      workspaceId: input.workspaceId,
      userId: input.userId,
      operation: context.operation,
      entityType: context.entityType,
      entityId: context.entityId,
      errorCategory: "secondary_async_failure",
    });
    return { created: false, id: null } as const;
  }
}

async function getNotificationContext() {
  const [userId, workspace] = await Promise.all([
    requireUserId(),
    getCurrentWorkspace(),
  ]);

  return { userId, workspaceId: workspace.id };
}

export async function getUnreadNotificationCount() {
  const { userId, workspaceId } = await getNotificationContext();

  const [result] = await db
    .select({ count: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.workspaceId, workspaceId),
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
      ),
    );

  return Number(result?.count ?? 0);
}

export async function getNotificationDropdownData(
  limit = 15,
): Promise<NotificationDropdownData> {
  const { userId, workspaceId } = await getNotificationContext();
  const safeLimit = Math.min(Math.max(limit, 1), MAX_NOTIFICATIONS_PER_DROPDOWN);

  const [notificationRows, unreadResult] = await Promise.all([
    db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        actionUrl: notifications.actionUrl,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.workspaceId, workspaceId),
          eq(notifications.userId, userId),
        ),
      )
      .orderBy(desc(notifications.createdAt))
      .limit(safeLimit),
    db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.workspaceId, workspaceId),
          eq(notifications.userId, userId),
          isNull(notifications.readAt),
        ),
      ),
  ]);

  return {
    notifications: notificationRows as NotificationListItem[],
    unreadCount: Number(unreadResult[0]?.count ?? 0),
    referenceTime: Date.now(),
  };
}

export async function markNotificationAsReadForCurrentUser(
  notificationId: string,
): Promise<NotificationMutationResult> {
  if (!isUuid(notificationId)) {
    return { success: false, message: "This notification could not be found." };
  }

  const { userId, workspaceId } = await getNotificationContext();

  const [updatedNotification] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.workspaceId, workspaceId),
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
      ),
    )
    .returning({ id: notifications.id });

  if (!updatedNotification) {
    return { success: false, message: "This notification is no longer available." };
  }

  return { success: true, unreadCount: await getUnreadNotificationCount() };
}

export async function markAllNotificationsAsReadForCurrentUser(): Promise<
  NotificationMutationResult
> {
  const { userId, workspaceId } = await getNotificationContext();

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.workspaceId, workspaceId),
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
      ),
    );

  return { success: true, unreadCount: 0 };
}
