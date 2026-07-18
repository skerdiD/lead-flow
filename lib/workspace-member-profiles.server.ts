import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { workspaceMembers } from "@/db/schema";
import { isSafeE2ETestMode } from "@/lib/e2e-test-mode";

export type WorkspaceMemberProfile = {
  name: string;
  imageUrl: string | null;
};

export type WorkspaceMemberOption = WorkspaceMemberProfile & {
  userId: string;
};

function getDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
}) {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    "Unknown member"
  );
}

/**
 * Resolves Clerk-backed member profiles in one membership query and one Clerk
 * request. Only active members of the requested workspace are ever returned.
 */
export async function getWorkspaceMemberOptions(
  workspaceId: string,
  requestedUserIds?: readonly string[],
): Promise<WorkspaceMemberOption[]> {
  const userIds = requestedUserIds
    ? [...new Set(requestedUserIds.filter(Boolean))]
    : undefined;

  if (userIds?.length === 0) return [];

  const memberships = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        userIds ? inArray(workspaceMembers.userId, userIds) : undefined,
      ),
    )
    .orderBy(asc(workspaceMembers.createdAt));

  if (memberships.length === 0) return [];

  const fallbackProfiles = new Map<string, WorkspaceMemberProfile>(
    memberships.map(({ userId }) => [
      userId,
      {
        name:
          isSafeE2ETestMode() &&
          userId === (process.env.E2E_USER_ID || "e2e-user")
            ? "Test user"
            : "Unknown member",
        imageUrl: null,
      },
    ]),
  );

  if (!isSafeE2ETestMode()) {
    try {
      const client = await clerkClient();
      const response = await client.users.getUserList({
        userId: memberships.map((membership) => membership.userId),
        limit: Math.max(memberships.length, 1),
      });

      for (const user of response.data) {
        fallbackProfiles.set(user.id, {
          name: getDisplayName(user),
          imageUrl: user.imageUrl || null,
        });
      }
    } catch {
      // A profile-provider outage must not block CRM records or expose raw IDs.
    }
  }

  return memberships.map(({ userId }) => ({
    userId,
    ...(fallbackProfiles.get(userId) ?? {
      name: "Unknown member",
      imageUrl: null,
    }),
  }));
}

export async function resolveWorkspaceMemberProfiles(
  workspaceId: string,
  userIds: readonly string[],
) {
  const members = await getWorkspaceMemberOptions(workspaceId, userIds);
  return new Map(
    members.map(({ userId, ...profile }) => [userId, profile] as const),
  );
}
