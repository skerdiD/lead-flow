import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;

describeDatabase("CSV import persistence integrity", () => {
  let pool: Pool;
  const workspaceIds: string[] = [];

  beforeAll(() => {
    const databaseName = new URL(testDatabaseUrl!).pathname.slice(1);
    if (!/(^|_)(test|ci)(_|$)/i.test(databaseName)) {
      throw new Error("TEST_DATABASE_URL must point to a dedicated test or CI database.");
    }
    pool = new Pool({ connectionString: testDatabaseUrl });
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
        "INSERT INTO workspaces (owner_user_id, name) VALUES ($1, $2) RETURNING id",
        [userId, `Import test ${randomUUID()}`],
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
});
