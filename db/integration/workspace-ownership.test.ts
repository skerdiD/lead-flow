import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import {
  WorkspaceOwnershipError,
  transferWorkspaceOwnershipInTransaction,
} from "@/lib/workspace-ownership";
import {
  createWorkspaceWithOwnerInTransaction,
  ensureWorkspaceForOwnerInTransaction,
} from "@/lib/workspace-creation";

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
    const workspace = await database.transaction((tx) =>
      createWorkspaceWithOwnerInTransaction(tx, {
        name: `Ownership ${label} ${randomUUID()}`,
        ownerUserId,
      }),
    );
    createdWorkspaceIds.push(workspace.id);

    return {
      id: workspace.id,
      ownerUserId,
      ownerMemberId: workspace.owner.memberId,
    };
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
    expectedCode: "P0001",
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

  it("creates a workspace and its owner membership atomically", async () => {
    const ownerUserId = `personal-owner-${randomUUID()}`;
    const name = `Personal Workspace ${randomUUID()}`;
    const workspace = await database.transaction((tx) =>
      createWorkspaceWithOwnerInTransaction(tx, { name, ownerUserId }),
    );
    createdWorkspaceIds.push(workspace.id);

    const state = await pool.query<{
      workspace_id: string;
      name: string;
      user_id: string;
      role: string;
    }>(
      `SELECT workspace.id AS workspace_id, workspace.name, member.user_id, member.role
       FROM workspaces workspace
       INNER JOIN workspace_members member ON member.workspace_id = workspace.id
       WHERE workspace.id = $1`,
      [workspace.id],
    );

    expect(state.rows).toEqual([
      {
        workspace_id: workspace.id,
        name,
        user_id: ownerUserId,
        role: "owner",
      },
    ]);
  });

  it("rolls back workspace creation when the owner membership fails", async () => {
    const name = `Rollback workspace ${randomUUID()}`;

    await expect(
      database.transaction((tx) =>
        createWorkspaceWithOwnerInTransaction(tx, {
          name,
          ownerUserId: "x".repeat(256),
        }),
      ),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({ code: "22001" }),
    });

    const workspace = await pool.query("SELECT id FROM workspaces WHERE name = $1", [name]);
    expect(workspace.rows).toHaveLength(0);
  });

  it("serializes concurrent personal workspace creation", async () => {
    const ownerUserId = `concurrent-personal-owner-${randomUUID()}`;
    const name = `Personal Workspace ${randomUUID()}`;
    const create = () =>
      database.transaction((tx) =>
        ensureWorkspaceForOwnerInTransaction(tx, { name, ownerUserId }),
      );

    const [first, second] = await Promise.all([create(), create()]);
    createdWorkspaceIds.push(first.id);

    expect(second.id).toBe(first.id);
    const workspacesForOwner = await pool.query(
      `SELECT workspace.id
       FROM workspaces workspace
       INNER JOIN workspace_members owner
         ON owner.workspace_id = workspace.id
        AND owner.role = 'owner'
       WHERE workspace.name = $1 AND owner.user_id = $2`,
      [name, ownerUserId],
    );
    expect(workspacesForOwner.rows).toHaveLength(1);
  });

  it("rejects a workspace committed without an owner", async () => {
    const name = `Ownerless workspace ${randomUUID()}`;

    await expect(
      pool.query("INSERT INTO workspaces (name) VALUES ($1)", [name]),
    ).rejects.toMatchObject({ code: "P0001" });

    const workspace = await pool.query("SELECT id FROM workspaces WHERE name = $1", [name]);
    expect(workspace.rows).toHaveLength(0);
  });

  it("transfers ownership atomically and records an audit event", async () => {
    const workspace = await createWorkspace("success");
    const target = await addMember(workspace.id, "admin");

    await expect(transfer(workspace, target.id)).resolves.toMatchObject({
      newOwnerMemberId: target.id,
      newOwnerUserId: target.userId,
    });

    const memberships = await pool.query<{ user_id: string; role: string }>(
      "SELECT user_id, role FROM workspace_members WHERE workspace_id = $1 ORDER BY user_id",
      [workspace.id],
    );
    const owners = memberships.rows.filter((member) => member.role === "owner");
    const event = await pool.query<{ event_type: string }>(
      "SELECT event_type FROM activity_events WHERE workspace_id = $1 AND event_type = 'ownership_transferred'",
      [workspace.id],
    );
    const auditEvent = await pool.query<{
      action: string;
      actor_user_id: string;
      actor_role: string;
      before: { ownerMemberId?: string } | null;
      after: { ownerMemberId?: string } | null;
    }>(
      `SELECT action, actor_user_id, actor_role, before, after
       FROM audit_logs
       WHERE workspace_id = $1 AND action = 'workspace.ownership_transferred'`,
      [workspace.id],
    );

    expect(memberships.rows.find((member) => member.user_id === workspace.ownerUserId)?.role).toBe("admin");
    expect(memberships.rows.find((member) => member.user_id === target.userId)?.role).toBe("owner");
    expect(owners).toHaveLength(1);
    expect(event.rows).toHaveLength(1);
    expect(auditEvent.rows).toEqual([
      {
        action: "workspace.ownership_transferred",
        actor_user_id: workspace.ownerUserId,
        actor_role: "owner",
        before: { ownerMemberId: workspace.ownerMemberId },
        after: { ownerMemberId: target.id },
      },
    ]);
  });

  it("rejects an admin attempting to transfer ownership", async () => {
    const workspace = await createWorkspace("admin-authorization");
    const admin = await addMember(workspace.id, "admin");
    const member = await addMember(workspace.id);

    await expect(transfer(workspace, member.id, admin.userId)).rejects.toBeInstanceOf(
      WorkspaceOwnershipError,
    );
  });

  it("requires the transfer target to belong to the workspace", async () => {
    const workspace = await createWorkspace("target-tenant");
    const secondMember = await addMember(workspace.id);
    const otherWorkspace = await createWorkspace("other");
    const otherMember = await addMember(otherWorkspace.id);

    await expect(transfer(workspace, otherMember.id)).rejects.toBeInstanceOf(
      WorkspaceOwnershipError,
    );
    await expect(
      transfer(workspace, "11111111-1111-4111-8111-111111111111"),
    ).rejects.toBeInstanceOf(WorkspaceOwnershipError);
    await expect(
      transfer(workspace, workspace.ownerMemberId),
    ).rejects.toBeInstanceOf(WorkspaceOwnershipError);
    await expect(transfer(workspace, secondMember.id)).resolves.toMatchObject({
      newOwnerMemberId: secondMember.id,
    });
  });

  it("prevents the current owner from being removed", async () => {
    const workspace = await createWorkspace("owner-removal");
    await expectOwnerProtection(
      pool.query("DELETE FROM workspace_members WHERE id = $1", [
        workspace.ownerMemberId,
      ]),
      "P0001",
    );

    await expect(
      pool.query<{ role: string }>(
        "SELECT role FROM workspace_members WHERE id = $1",
        [workspace.ownerMemberId],
      ),
    ).resolves.toMatchObject({ rows: [{ role: "owner" }] });
  });

  it("prevents the current owner from leaving the workspace", async () => {
    const workspace = await createWorkspace("owner-leave");

    await expectOwnerProtection(
      pool.query(
        "DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
        [workspace.id, workspace.ownerUserId],
      ),
      "P0001",
    );

    await expect(
      pool.query<{ role: string }>(
        "SELECT role FROM workspace_members WHERE id = $1",
        [workspace.ownerMemberId],
      ),
    ).resolves.toMatchObject({ rows: [{ role: "owner" }] });
  });

  it("rejects generic attempts to demote, invite, or promote another owner", async () => {
    const workspace = await createWorkspace("guardrails");
    const member = await addMember(workspace.id);

    await expectOwnerProtection(
      pool.query("UPDATE workspace_members SET role = 'admin' WHERE id = $1", [
        workspace.ownerMemberId,
      ]),
      "P0001",
    );
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
    const events = await pool.query(
      "SELECT id FROM activity_events WHERE workspace_id = $1 AND event_type = 'ownership_transferred'",
      [workspace.id],
    );

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

    const memberships = await pool.query<{ user_id: string; role: string }>(
      "SELECT user_id, role FROM workspace_members WHERE workspace_id = $1",
      [workspace.id],
    );
    const owners = memberships.rows.filter((member) => member.role === "owner");

    expect(owners).toHaveLength(1);
    expect(memberships.rows.find((member) => member.user_id === workspace.ownerUserId)?.role).toBe("admin");
  });
});
