import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import {
  WorkspaceOwnershipError,
  transferWorkspaceOwnershipInTransaction,
} from "@/lib/workspace-ownership";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;

type WorkspaceFixture = {
  id: string;
  ownerUserId: string;
  ownerMemberId: string;
};

describeDatabase("workspace ownership integrity", () => {
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

  async function createWorkspace(label: string): Promise<WorkspaceFixture> {
    const ownerUserId = `ownership-owner-${randomUUID()}`;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const workspace = await client.query<{ id: string }>(
        "INSERT INTO workspaces (owner_user_id, name) VALUES ($1, $2) RETURNING id",
        [ownerUserId, `Ownership ${label} ${randomUUID()}`],
      );
      const workspaceId = workspace.rows[0]!.id;
      const member = await client.query<{ id: string }>(
        "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner') RETURNING id",
        [workspaceId, ownerUserId],
      );
      await client.query("COMMIT");
      createdWorkspaceIds.push(workspaceId);

      return {
        id: workspaceId,
        ownerUserId,
        ownerMemberId: member.rows[0]!.id,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async function addMember(
    workspaceId: string,
    role: "admin" | "member" = "member",
  ) {
    const userId = `ownership-member-${randomUUID()}`;
    const member = await pool.query<{ id: string }>(
      "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3) RETURNING id",
      [workspaceId, userId, role],
    );

    return { id: member.rows[0]!.id, userId };
  }

  async function transfer(
    workspace: WorkspaceFixture,
    targetMemberId: string,
    actorUserId = workspace.ownerUserId,
  ) {
    return database.transaction((tx) =>
      transferWorkspaceOwnershipInTransaction(tx, {
        workspaceId: workspace.id,
        actorUserId,
        targetMemberId,
      }),
    );
  }

  async function expectOwnerProtection(
    query: Promise<unknown>,
    expectedCode: "P0001" | "23503",
  ) {
    try {
      await query;
      throw new Error("Expected the ownership invariant to reject this mutation.");
    } catch (error) {
      expect(error).toMatchObject({
        code: expectedCode,
      });
    }
  }

  it("transfers ownership atomically and records an audit event", async () => {
    const workspace = await createWorkspace("success");
    const target = await addMember(workspace.id, "admin");

    await expect(transfer(workspace, target.id)).resolves.toMatchObject({
      newOwnerMemberId: target.id,
      newOwnerUserId: target.userId,
    });

    const [state, audit] = await Promise.all([
      pool.query<{ owner_user_id: string }>(
        "SELECT owner_user_id FROM workspaces WHERE id = $1",
        [workspace.id],
      ),
      pool.query<{ user_id: string; role: string }>(
        "SELECT user_id, role FROM workspace_members WHERE workspace_id = $1 ORDER BY user_id",
        [workspace.id],
      ),
    ]);
    const ownerCount = audit.rows.filter((member) => member.role === "owner");
    const event = await pool.query<{ event_type: string }>(
      "SELECT event_type FROM activity_events WHERE workspace_id = $1 AND event_type = 'ownership_transferred'",
      [workspace.id],
    );

    expect(state.rows[0]?.owner_user_id).toBe(target.userId);
    expect(audit.rows.find((member) => member.user_id === workspace.ownerUserId)?.role).toBe("admin");
    expect(audit.rows.find((member) => member.user_id === target.userId)?.role).toBe("owner");
    expect(ownerCount).toHaveLength(1);
    expect(event.rows).toHaveLength(1);
  });

  it("rejects non-owners, admins, cross-workspace targets, and missing targets", async () => {
    const workspace = await createWorkspace("authorization");
    const admin = await addMember(workspace.id, "admin");
    const member = await addMember(workspace.id);
    const secondMember = await addMember(workspace.id);
    const otherWorkspace = await createWorkspace("other");
    const otherMember = await addMember(otherWorkspace.id);

    await expect(transfer(workspace, member.id, admin.userId)).rejects.toBeInstanceOf(
      WorkspaceOwnershipError,
    );
    await expect(
      transfer(workspace, secondMember.id, member.userId),
    ).rejects.toBeInstanceOf(WorkspaceOwnershipError);
    await expect(transfer(workspace, otherMember.id)).rejects.toBeInstanceOf(
      WorkspaceOwnershipError,
    );
    await expect(
      transfer(workspace, "11111111-1111-4111-8111-111111111111"),
    ).rejects.toBeInstanceOf(WorkspaceOwnershipError);
    await expect(
      transfer(workspace, workspace.ownerMemberId),
    ).rejects.toBeInstanceOf(WorkspaceOwnershipError);
  });

  it("rejects generic attempts to demote, remove, invite, or promote another owner", async () => {
    const workspace = await createWorkspace("guardrails");
    const member = await addMember(workspace.id);

    await expectOwnerProtection(
      pool.query("UPDATE workspace_members SET role = 'admin' WHERE id = $1", [
        workspace.ownerMemberId,
      ]),
      "P0001",
    );
    await expectOwnerProtection(
      pool.query("DELETE FROM workspace_members WHERE id = $1", [
        workspace.ownerMemberId,
      ]),
      "23503",
    );

    await expect(
      pool.query<{ role: string }>(
        "SELECT role FROM workspace_members WHERE id = $1",
        [workspace.ownerMemberId],
      ),
    ).resolves.toMatchObject({ rows: [{ role: "owner" }] });
    await expect(
      pool.query("UPDATE workspace_members SET role = 'owner' WHERE id = $1", [
        member.id,
      ]),
    ).rejects.toMatchObject({ code: "23505" });
    await expect(
      pool.query(
        "INSERT INTO workspace_invitations (workspace_id, email, role, token_hash, expires_at, created_by_user_id) VALUES ($1, $2, 'owner', $3, now() + interval '1 day', $4)",
        [
          workspace.id,
          `owner-${randomUUID()}@example.com`,
          randomUUID().replaceAll("-", ""),
          workspace.ownerUserId,
        ],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("rolls back every ownership change when the transaction fails", async () => {
    const workspace = await createWorkspace("rollback");
    const target = await addMember(workspace.id);

    await expect(
      database.transaction(async (tx) => {
        await transferWorkspaceOwnershipInTransaction(tx, {
          workspaceId: workspace.id,
          actorUserId: workspace.ownerUserId,
          targetMemberId: target.id,
        });
        throw new Error("force rollback");
      }),
    ).rejects.toThrow("force rollback");

    const memberships = await pool.query<{ user_id: string; role: string }>(
      "SELECT user_id, role FROM workspace_members WHERE workspace_id = $1",
      [workspace.id],
    );
    const workspaceState = await pool.query<{ owner_user_id: string }>(
      "SELECT owner_user_id FROM workspaces WHERE id = $1",
      [workspace.id],
    );
    const events = await pool.query(
      "SELECT id FROM activity_events WHERE workspace_id = $1 AND event_type = 'ownership_transferred'",
      [workspace.id],
    );

    expect(workspaceState.rows[0]?.owner_user_id).toBe(workspace.ownerUserId);
    expect(memberships.rows.find((member) => member.user_id === workspace.ownerUserId)?.role).toBe("owner");
    expect(memberships.rows.find((member) => member.user_id === target.userId)?.role).toBe("member");
    expect(events.rows).toHaveLength(0);
  });

  it("serializes simultaneous transfers and leaves one consistent owner", async () => {
    const workspace = await createWorkspace("concurrency");
    const firstTarget = await addMember(workspace.id);
    const secondTarget = await addMember(workspace.id, "admin");

    const results = await Promise.allSettled([
      transfer(workspace, firstTarget.id),
      transfer(workspace, secondTarget.id),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);

    const [workspaceState, memberships] = await Promise.all([
      pool.query<{ owner_user_id: string }>(
        "SELECT owner_user_id FROM workspaces WHERE id = $1",
        [workspace.id],
      ),
      pool.query<{ user_id: string; role: string }>(
        "SELECT user_id, role FROM workspace_members WHERE workspace_id = $1",
        [workspace.id],
      ),
    ]);
    const owners = memberships.rows.filter((member) => member.role === "owner");

    expect(owners).toHaveLength(1);
    expect(workspaceState.rows[0]?.owner_user_id).toBe(owners[0]?.user_id);
    expect(memberships.rows.find((member) => member.user_id === workspace.ownerUserId)?.role).toBe("admin");
  });
});
