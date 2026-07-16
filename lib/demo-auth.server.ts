import "server-only";

import { createClerkClient } from "@clerk/backend";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaceMembers, workspaces } from "@/db/schema";
import { isDemoRole, type DemoRole, DEMO_WORKSPACE_NAME } from "@/lib/demo";
import {
  DemoConfigurationError,
  getDemoUserConfig,
  getDemoUserConfigs,
  isDemoLoginEnabled,
} from "@/lib/demo-config.server";

const DEMO_SIGN_IN_EXPIRY_SECONDS = 300;

export class DemoLoginError extends Error {
  constructor(
    public readonly status: 400 | 503,
    public readonly internalMessage: string,
  ) {
    super("We couldn't prepare this demo role right now. Please try again.");
    this.name = "DemoLoginError";
  }
}

function getClerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    throw new DemoLoginError(503, "CLERK_SECRET_KEY is not configured.");
  }

  return createClerkClient({ secretKey });
}

function userMatchesConfiguredIdentity(
  user: {
    externalId: string | null;
    emailAddresses: Array<{ emailAddress: string }>;
  },
  config: ReturnType<typeof getDemoUserConfig>,
) {
  return (
    user.externalId === config.externalId &&
    user.emailAddresses.some(
      (emailAddress) =>
        emailAddress.emailAddress.trim().toLowerCase() === config.email,
    )
  );
}

async function getConfiguredClerkUser(role: DemoRole) {
  const config = getDemoUserConfig(role);
  const client = getClerkClient();
  const response = await client.users.getUserList({
    externalId: [config.externalId],
    limit: 1,
  });
  const user = response.data[0];

  if (!user || !userMatchesConfiguredIdentity(user, config)) {
    throw new DemoLoginError(
      503,
      `Configured demo ${role} Clerk user is missing or does not match its configured identity.`,
    );
  }

  return user;
}

export async function getCurrentDemoRole(userId: string | null) {
  if (!userId || !isDemoLoginEnabled()) return null;

  try {
    const configuredUsers = await Promise.all(
      (["owner", "admin", "member"] as const).map(async (role) => ({
        role,
        user: await getConfiguredClerkUser(role),
      })),
    );

    return configuredUsers.find(({ user }) => user.id === userId)?.role ?? null;
  } catch {
    return null;
  }
}

export async function createDemoSignInUrl(role: DemoRole) {
  if (!isDemoRole(role)) {
    throw new DemoLoginError(400, "A non-allowlisted demo role was requested.");
  }

  if (!isDemoLoginEnabled()) {
    throw new DemoLoginError(503, "Demo login is disabled.");
  }

  try {
    const configs = getDemoUserConfigs();
    const [owner, selectedUser] = await Promise.all([
      getConfiguredClerkUser("owner"),
      getConfiguredClerkUser(role),
    ]);

    const [workspace] = await db
      .select({
        id: workspaces.id,
        ownerUserId: workspaces.ownerUserId,
      })
      .from(workspaces)
      .where(
        and(
          eq(workspaces.name, DEMO_WORKSPACE_NAME),
          eq(workspaces.ownerUserId, owner.id),
        ),
      )
      .limit(1);

    if (!workspace || workspace.ownerUserId !== owner.id) {
      throw new DemoLoginError(503, "Configured demo workspace is missing.");
    }

    const [membership] = await db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspace.id),
          eq(workspaceMembers.userId, selectedUser.id),
        ),
      )
      .limit(1);

    if (!membership || membership.role !== role) {
      throw new DemoLoginError(
        503,
        `Configured demo ${role} membership is missing or has a mismatched role.`,
      );
    }

    if (configs[role].externalId !== selectedUser.externalId) {
      throw new DemoLoginError(503, "Configured demo identity did not match.");
    }

    const token = await getClerkClient().signInTokens.createSignInToken({
      userId: selectedUser.id,
      expiresInSeconds: DEMO_SIGN_IN_EXPIRY_SECONDS,
    });

    if (!token.url) {
      throw new DemoLoginError(503, "Clerk did not return a demo sign-in URL.");
    }

    return token.url;
  } catch (error) {
    if (error instanceof DemoLoginError) throw error;

    if (error instanceof DemoConfigurationError) {
      throw new DemoLoginError(503, error.message);
    }

    throw new DemoLoginError(
      503,
      error instanceof Error ? error.message : "Unknown demo login error.",
    );
  }
}
