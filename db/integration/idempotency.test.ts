import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import {
  executeIdempotentMutation,
  IdempotencyConflictError,
} from "@/lib/idempotency.server";
import type { DatabaseClient } from "@/lib/db-client";
import { createWorkspaceWithOwnerInTransaction } from "@/lib/workspace-creation";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;

describeDatabase("PostgreSQL mutation idempotency", () => {
  let pool: Pool;
  let database: ReturnType<typeof drizzle<typeof schema>>;
  const workspaceIds: string[] = [];

  beforeAll(() => {
    const databaseName = new URL(testDatabaseUrl!).pathname.slice(1);
    if (!/(^|_)(test|ci)(_|$)/i.test(databaseName)) {
      throw new Error("TEST_DATABASE_URL must point to a dedicated test or CI database.");
    }
    pool = new Pool({ connectionString: testDatabaseUrl, max: 8 });
    database = drizzle(pool, { schema });
  });

  afterEach(async () => {
    if (workspaceIds.length > 0) {
      await pool.query("DELETE FROM workspaces WHERE id = ANY($1::uuid[])", [workspaceIds.splice(0)]);
    }
  });

  afterAll(async () => pool.end());

  async function createWorkspace(actorUserId = `actor-${randomUUID()}`) {
    const workspace = await database.transaction((tx) =>
      createWorkspaceWithOwnerInTransaction(tx, {
        name: `Idempotency ${randomUUID()}`,
        ownerUserId: actorUserId,
      }),
    );
    workspaceIds.push(workspace.id);
    return { workspaceId: workspace.id, actorUserId };
  }

  function scope(workspaceId: string, actorUserId: string, action: string, key = randomUUID(), request: unknown = {}) {
    return { workspaceId, actorUserId, action, idempotencyKey: key, request };
  }

  it("stores the first result, replays an identical retry, and rejects changed input", async () => {
    const actor = await createWorkspace();
    const key = randomUUID();
    let executions = 0;
    const currentScope = scope(actor.workspaceId, actor.actorUserId, "test.first", key, { name: "Acme" });
    const mutation = async () => ({ response: { id: `result-${++executions}` } });

    const first = await executeIdempotentMutation(currentScope, mutation, database);
    const retry = await executeIdempotentMutation(currentScope, mutation, database);

    expect(first).toEqual({ value: { id: "result-1" }, replayed: false });
    expect(retry).toEqual({ value: { id: "result-1" }, replayed: true });
    expect(executions).toBe(1);
    await expect(executeIdempotentMutation(
      { ...currentScope, request: { name: "Different" } },
      mutation,
      database,
    )).rejects.toBeInstanceOf(IdempotencyConflictError);
  });

  it("allows concurrent deal creation to create exactly one deal", async () => {
    const actor = await createWorkspace();
    const key = randomUUID();
    const currentScope = scope(actor.workspaceId, actor.actorUserId, "deal.create", key, { name: "One deal" });
    const mutation = async (tx: DatabaseClient) => {
      const [deal] = await tx.insert(schema.deals).values({
        workspaceId: actor.workspaceId,
        userId: actor.actorUserId,
        name: "One deal",
      }).returning({ id: schema.deals.id });
      return { response: { id: deal!.id }, resource: { type: "deal", id: deal!.id } };
    };

    const [left, right] = await Promise.all([
      executeIdempotentMutation(currentScope, mutation, database),
      executeIdempotentMutation(currentScope, mutation, database),
    ]);
    expect(left.value.id).toBe(right.value.id);
    const count = await pool.query<{ count: string }>("SELECT count(*) FROM deals WHERE workspace_id = $1", [actor.workspaceId]);
    expect(Number(count.rows[0]!.count)).toBe(1);
  });

  it("allows concurrent qualification to create one deal and one qualification event", async () => {
    const actor = await createWorkspace();
    const leadResult = await pool.query<{ id: string }>(
      "INSERT INTO leads (workspace_id, user_id, full_name) VALUES ($1, $2, 'Qualified lead') RETURNING id",
      [actor.workspaceId, actor.actorUserId],
    );
    const leadId = leadResult.rows[0]!.id;
    const currentScope = scope(actor.workspaceId, actor.actorUserId, "lead.qualify", randomUUID(), { leadId });
    const mutation = async (tx: DatabaseClient) => {
      const [deal] = await tx.insert(schema.deals).values({ workspaceId: actor.workspaceId, userId: actor.actorUserId, leadId, name: "Qualified deal" }).returning({ id: schema.deals.id });
      await tx.insert(schema.activityEvents).values({ workspaceId: actor.workspaceId, userId: actor.actorUserId, leadId, eventType: "lead_qualified", message: "Qualified" });
      return { response: { dealId: deal!.id } };
    };
    await Promise.all([
      executeIdempotentMutation(currentScope, mutation, database),
      executeIdempotentMutation(currentScope, mutation, database),
    ]);
    const counts = await pool.query<{ deals: string; events: string }>(
      "SELECT (SELECT count(*) FROM deals WHERE lead_id = $1) deals, (SELECT count(*) FROM activity_events WHERE lead_id = $1 AND event_type = 'lead_qualified') events",
      [leadId],
    );
    expect(counts.rows[0]).toEqual({ deals: "1", events: "1" });
  });

  it("allows concurrent invitation acceptance to create one membership", async () => {
    const actor = await createWorkspace("owner");
    const invitedUserId = `invitee-${randomUUID()}`;
    const key = randomUUID();
    const currentScope = scope(actor.workspaceId, invitedUserId, "workspace.invitation.accept", key, { tokenHash: "safe-hash" });
    const mutation = async (tx: DatabaseClient) => {
      const [member] = await tx.insert(schema.workspaceMembers).values({ workspaceId: actor.workspaceId, userId: invitedUserId, role: "member" }).returning({ id: schema.workspaceMembers.id });
      return { response: { membershipId: member!.id } };
    };
    const results = await Promise.all([
      executeIdempotentMutation(currentScope, mutation, database),
      executeIdempotentMutation(currentScope, mutation, database),
    ]);
    expect(results[0].value).toEqual(results[1].value);
    const count = await pool.query<{ count: string }>("SELECT count(*) FROM workspace_members WHERE workspace_id = $1 AND user_id = $2", [actor.workspaceId, invitedUserId]);
    expect(count.rows[0]!.count).toBe("1");
  });

  it("rolls back the reservation and business writes when the transaction fails", async () => {
    const actor = await createWorkspace();
    const currentScope = scope(actor.workspaceId, actor.actorUserId, "deal.create", randomUUID(), { name: "Rollback" });
    await expect(executeIdempotentMutation(currentScope, async (tx) => {
      await tx.insert(schema.deals).values({ workspaceId: actor.workspaceId, userId: actor.actorUserId, name: "Rollback" });
      throw new Error("forced failure");
    }, database)).rejects.toThrow("forced failure");
    const counts = await pool.query<{ deals: string; keys: string }>(
      "SELECT (SELECT count(*) FROM deals WHERE workspace_id = $1) deals, (SELECT count(*) FROM idempotency_records WHERE workspace_id = $1) keys",
      [actor.workspaceId],
    );
    expect(counts.rows[0]).toEqual({ deals: "0", keys: "0" });
  });

  it("does not reserve before authorization and isolates keys by actor and workspace", async () => {
    const first = await createWorkspace();
    const second = await createWorkspace();
    const key = randomUUID();
    const authorizeThenRun = async (authorized: boolean, currentScope: ReturnType<typeof scope>) => {
      if (!authorized) throw new Error("unauthorized");
      return executeIdempotentMutation(currentScope, async () => ({ response: { ok: true } }), database);
    };
    await expect(authorizeThenRun(false, scope(first.workspaceId, first.actorUserId, "bulk", key))).rejects.toThrow("unauthorized");
    await authorizeThenRun(true, scope(first.workspaceId, first.actorUserId, "bulk", key));
    await authorizeThenRun(true, scope(first.workspaceId, "another-actor", "bulk", key));
    await authorizeThenRun(true, scope(second.workspaceId, second.actorUserId, "bulk", key));
    const count = await pool.query<{ count: string }>("SELECT count(*) FROM idempotency_records WHERE idempotency_key = $1", [key]);
    expect(count.rows[0]!.count).toBe("3");
  });

  it("treats an expired completed record as a new request", async () => {
    const actor = await createWorkspace();
    const key = randomUUID();
    const initial = scope(actor.workspaceId, actor.actorUserId, "bulk", key, { version: 1 });
    await executeIdempotentMutation(initial, async () => ({ response: { version: 1 } }), database);
    await pool.query("UPDATE idempotency_records SET expires_at = now() - interval '1 minute' WHERE workspace_id = $1", [actor.workspaceId]);
    const repeated = await executeIdempotentMutation(
      { ...initial, request: { version: 2 } },
      async () => ({ response: { version: 2 } }),
      database,
    );
    expect(repeated).toEqual({ value: { version: 2 }, replayed: false });
  });
});
