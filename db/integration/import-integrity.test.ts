import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import { assertImportRowRelationships } from "@/lib/imports/relationships.server";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;

describeDatabase("CSV import persistence integrity", () => {
  let pool: Pool;
  let database: ReturnType<typeof drizzle<typeof schema>>;
  const workspaceIds: string[] = [];

  beforeAll(() => {
    const databaseName = new URL(testDatabaseUrl!).pathname.slice(1);
    if (!/(^|_)(test|ci)(_|$)/i.test(databaseName)) {
      throw new Error("TEST_DATABASE_URL must point to a dedicated test or CI database.");
    }
    pool = new Pool({ connectionString: testDatabaseUrl });
    database = drizzle(pool, { schema });
  });

  afterEach(async () => {
    if (workspaceIds.length) {
      await pool.query("DELETE FROM workspaces WHERE id = ANY($1::uuid[])", [
        workspaceIds.splice(0),
      ]);
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  async function workspace() {
    const userId = `import-test-${randomUUID()}`;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const created = await client.query<{ id: string }>(
        "INSERT INTO workspaces (name) VALUES ($1) RETURNING id",
        [`Import test ${randomUUID()}`],
      );
      const id = created.rows[0]!.id;

      await client.query(
        "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')",
        [id, userId],
      );
      await client.query("COMMIT");
      workspaceIds.push(id);

      return { id, userId };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async function job(workspaceId: string, userId: string, idempotencyKey: string) {
    return pool.query<{ id: string }>(
      `INSERT INTO import_jobs (
        workspace_id, actor_user_id, actor_name, entity_type,
        original_file_name, file_hash, idempotency_key
      ) VALUES ($1, $2, 'Tester', 'lead', 'leads.csv', $3, $4) RETURNING id`,
      [workspaceId, userId, "a".repeat(64), idempotencyKey],
    );
  }

  it("enforces workspace-scoped idempotency keys", async () => {
    const current = await workspace();
    const key = randomUUID();
    await job(current.id, current.userId, key);
    await expect(job(current.id, current.userId, key)).rejects.toMatchObject({
      code: "23505",
      constraint: "import_jobs_workspace_idempotency_unique",
    });
  });

  it("rejects import rows attached through another workspace", async () => {
    const first = await workspace();
    const second = await workspace();
    const created = await job(first.id, first.userId, randomUUID());
    await expect(
      pool.query(
        `INSERT INTO import_rows (
          workspace_id, import_job_id, row_number, raw_data
        ) VALUES ($1, $2, 2, '{}'::jsonb)`,
        [second.id, created.rows[0]!.id],
      ),
    ).rejects.toMatchObject({
      code: "23503",
      constraint: "import_rows_workspace_job_tenant_fk",
    });
  });

  it("rejects modified owner, account, and contact relationships from another workspace", async () => {
    const active = await workspace();
    const outside = await workspace();
    const [outsideAccount] = await database
      .insert(schema.accounts)
      .values({
        workspaceId: outside.id,
        userId: outside.userId,
        assignedOwnerUserId: outside.userId,
        name: "Outside account",
      })
      .returning({ id: schema.accounts.id });
    const [outsideContact] = await database
      .insert(schema.contacts)
      .values({
        workspaceId: outside.id,
        userId: outside.userId,
        assignedOwnerUserId: outside.userId,
        fullName: "Outside contact",
      })
      .returning({ id: schema.contacts.id });

    await expect(
      assertImportRowRelationships(database, active.id, {
        assignedOwnerUserId: outside.userId,
        accountId: outsideAccount!.id,
        primaryContactId: outsideContact!.id,
      }),
    ).rejects.toThrow("An import relationship is no longer available.");
  });

  it("accepts only current active-workspace import relationships", async () => {
    const active = await workspace();
    const [account] = await database
      .insert(schema.accounts)
      .values({
        workspaceId: active.id,
        userId: active.userId,
        assignedOwnerUserId: active.userId,
        name: "Active account",
      })
      .returning({ id: schema.accounts.id });
    const [contact] = await database
      .insert(schema.contacts)
      .values({
        workspaceId: active.id,
        userId: active.userId,
        assignedOwnerUserId: active.userId,
        fullName: "Active contact",
      })
      .returning({ id: schema.contacts.id });

    await expect(
      assertImportRowRelationships(database, active.id, {
        assignedOwnerUserId: active.userId,
        accountId: account!.id,
        primaryContactId: contact!.id,
      }),
    ).resolves.toBeUndefined();
  });
});
