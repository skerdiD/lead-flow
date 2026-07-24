import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import { createLeadActivity } from "@/app/dashboard/leads/services/activity-service";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;

type WorkspaceFixture = { id: string; userId: string };

describeDatabase("activity transaction integrity", () => {
  let pool: Pool;
  let database: ReturnType<typeof drizzle<typeof schema>>;
  let createdWorkspaceIds: string[] = [];

  beforeAll(() => {
    const databaseName = new URL(testDatabaseUrl!).pathname.slice(1);
    if (!/(^|_)(test|ci)(_|$)/i.test(databaseName)) {
      throw new Error("TEST_DATABASE_URL must point to a dedicated test or CI database.");
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
    const userId = `activity-transaction-${randomUUID()}`;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const workspace = await client.query<{ id: string }>(
        "INSERT INTO workspaces (name) VALUES ($1) RETURNING id",
        [`Activity transaction ${label} ${randomUUID()}`],
      );
      const id = workspace.rows[0]!.id;

      await client.query(
        "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')",
        [id, userId],
      );
      await client.query("COMMIT");
      createdWorkspaceIds.push(id);

      return { id, userId };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  it("commits a lead and its required activity event together", async () => {
    const workspace = await createWorkspace("commit");
    const leadName = `Transactional lead ${randomUUID()}`;

    await database.transaction(async (tx) => {
      const [lead] = await tx
        .insert(schema.leads)
        .values({ workspaceId: workspace.id, userId: workspace.userId, fullName: leadName })
        .returning({ id: schema.leads.id, fullName: schema.leads.fullName });

      await createLeadActivity({
        client: tx,
        workspaceId: workspace.id,
        userId: workspace.userId,
        eventType: "lead_created",
        message: `Lead created: ${lead.fullName}`,
        leadId: lead.id,
        leadName: lead.fullName,
      });
    });

    const [leads, activities] = await Promise.all([
      pool.query("SELECT id FROM leads WHERE workspace_id = $1", [workspace.id]),
      pool.query(
        "SELECT id FROM activity_events WHERE workspace_id = $1 AND event_type = 'lead_created'",
        [workspace.id],
      ),
    ]);

    expect(leads.rows).toHaveLength(1);
    expect(activities.rows).toHaveLength(1);
  });

  it("rolls back the lead when its required activity insert fails", async () => {
    const workspace = await createWorkspace("rollback");

    await expect(
      database.transaction(async (tx) => {
        const [lead] = await tx
          .insert(schema.leads)
          .values({
            workspaceId: workspace.id,
            userId: workspace.userId,
            fullName: `Rollback lead ${randomUUID()}`,
          })
          .returning({ id: schema.leads.id });

        await createLeadActivity({
          client: tx,
          workspaceId: workspace.id,
          userId: workspace.userId,
          eventType: "lead_created",
          message: "x".repeat(256),
          leadId: lead.id,
        });
      }),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({ code: "22001" }),
    });

    const [leads, activities] = await Promise.all([
      pool.query("SELECT id FROM leads WHERE workspace_id = $1", [workspace.id]),
      pool.query("SELECT id FROM activity_events WHERE workspace_id = $1", [workspace.id]),
    ]);

    expect(leads.rows).toHaveLength(0);
    expect(activities.rows).toHaveLength(0);
  });
});
