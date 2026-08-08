import { randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import { acceptWorkspaceInvitationInTransaction } from "@/lib/workspace-invitations";
import { createWorkspaceWithOwnerInTransaction } from "@/lib/workspace-creation";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;

describeDatabase("workspace invitation acceptance", () => {
  let pool: Pool;
  let database: ReturnType<typeof drizzle<typeof schema>>;
  let createdWorkspaceIds: string[] = [];

  beforeAll(() => {
    const databaseName = new URL(testDatabaseUrl!).pathname.slice(1);
    if (!/(^|_)(test|ci)(_|$)/i.test(databaseName)) {
      throw new Error(
        "TEST_DATABASE_URL must point to a dedicated test or CI database.",
      );
    }

    pool = new Pool({ connectionString: testDatabaseUrl });
    database = drizzle(pool, { schema });
  });

  beforeEach(() => {
    createdWorkspaceIds = [];
  });

  afterEach(async () => {
    if (createdWorkspaceIds.length > 0) {
      await pool.query("DELETE FROM workspaces WHERE id = ANY($1::uuid[])", [
        createdWorkspaceIds,
      ]);
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  async function createWorkspace() {
    const workspace = await database.transaction((tx) =>
      createWorkspaceWithOwnerInTransaction(tx, {
        name: `Invitation test ${randomUUID()}`,
        ownerUserId: `owner-${randomUUID()}`,
      }),
    );
    createdWorkspaceIds.push(workspace.id);
    return workspace.id;
  }

  async function createInvitation(options: {
    status?: "pending" | "accepted" | "revoked";
    expiresAt: Date;
  }) {
    const workspaceId = await createWorkspace();
    const email = `invitee-${randomUUID()}@example.com`;
    const tokenHash = randomUUID().replaceAll("-", "");
    await database.insert(schema.workspaceInvitations).values({
      workspaceId,
      email,
      tokenHash,
      status: options.status ?? "pending",
      role: "member",
      expiresAt: options.expiresAt,
      createdByUserId: `owner-${randomUUID()}`,
    });
    return { workspaceId, email, tokenHash };
  }

  const accept = (
    fixture: { tokenHash: string; email: string },
    userId: string,
  ) =>
    database.transaction((tx) =>
      acceptWorkspaceInvitationInTransaction(tx, {
        tokenHash: fixture.tokenHash,
        userId,
        verifiedEmails: [fixture.email.toLowerCase()],
      }),
    );

  it("rejects an expired invitation", async () => {
    const invitation = await createInvitation({
      expiresAt: new Date(Date.now() - 1_000),
    });

    await expect(accept(invitation, `user-${randomUUID()}`)).rejects.toMatchObject({
      code: "invalid_or_expired",
    });
  });

  it("rejects a non-pending invitation", async () => {
    const invitation = await createInvitation({
      status: "revoked",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(accept(invitation, `user-${randomUUID()}`)).rejects.toMatchObject({
      code: "invalid_or_expired",
    });
  });

  it("rejects an email mismatch without consuming the invitation", async () => {
    const invitation = await createInvitation({
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      database.transaction((tx) =>
        acceptWorkspaceInvitationInTransaction(tx, {
          tokenHash: invitation.tokenHash,
          userId: `user-${randomUUID()}`,
          verifiedEmails: ["attacker@example.com"],
        }),
      ),
    ).rejects.toMatchObject({ code: "email_mismatch" });

    const stored = await pool.query<{ status: string }>(
      "SELECT status FROM workspace_invitations WHERE token_hash = $1",
      [invitation.tokenHash],
    );
    expect(stored.rows[0]?.status).toBe("pending");
  });

  it("rejects a reused invitation and never creates membership in another workspace", async () => {
    const invitation = await createInvitation({
      expiresAt: new Date(Date.now() + 60_000),
    });
    const unrelatedWorkspaceId = await createWorkspace();
    const firstUserId = `user-${randomUUID()}`;
    const secondUserId = `user-${randomUUID()}`;

    await accept(invitation, firstUserId);
    await expect(accept(invitation, secondUserId)).rejects.toMatchObject({
      code: "invalid_or_expired",
    });

    const memberships = await pool.query<{ workspace_id: string; user_id: string }>(
      "SELECT workspace_id, user_id FROM workspace_members WHERE user_id = ANY($1::text[])",
      [[firstUserId, secondUserId]],
    );
    expect(memberships.rows).toEqual([
      { workspace_id: invitation.workspaceId, user_id: firstUserId },
    ]);
    expect(memberships.rows.some((row) => row.workspace_id === unrelatedWorkspaceId)).toBe(false);
  });

  it("allows only one concurrent acceptance and creates one membership", async () => {
    const invitation = await createInvitation({
      expiresAt: new Date(Date.now() + 60_000),
    });
    const userId = `user-${randomUUID()}`;

    const results = await Promise.allSettled([
      accept(invitation, userId),
      accept(invitation, userId),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);

    const memberships = await pool.query<{ count: string }>(
      "SELECT count(*) FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
      [invitation.workspaceId, userId],
    );
    expect(Number(memberships.rows[0]?.count)).toBe(1);
  });
});
