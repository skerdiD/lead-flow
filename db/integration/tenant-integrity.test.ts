import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;

type WorkspaceFixture = {
  id: string;
  userId: string;
};

describeDatabase("workspace relationship integrity", () => {
  let pool: Pool;
  let createdWorkspaceIds: string[] = [];

  beforeAll(() => {
    const databaseName = new URL(testDatabaseUrl!).pathname.slice(1);

    if (!/(^|_)(test|ci)(_|$)/i.test(databaseName)) {
      throw new Error(
        "TEST_DATABASE_URL must point to a dedicated test or CI database.",
      );
    }

    pool = new Pool({ connectionString: testDatabaseUrl });
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
    const userId = `tenant-integrity-${randomUUID()}`;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const workspaceResult = await client.query<{ id: string }>(
        "INSERT INTO workspaces (owner_user_id, name) VALUES ($1, $2) RETURNING id",
        [userId, `Tenant integrity ${label} ${randomUUID()}`],
      );
      const workspaceId = workspaceResult.rows[0]!.id;

      await client.query(
        "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')",
        [workspaceId, userId],
      );
      await client.query("COMMIT");
      createdWorkspaceIds.push(workspaceId);

      return { id: workspaceId, userId };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async function createAccount(workspace: WorkspaceFixture) {
    const result = await pool.query<{ id: string }>(
      "INSERT INTO accounts (workspace_id, user_id, name) VALUES ($1, $2, $3) RETURNING id",
      [workspace.id, workspace.userId, `Account ${randomUUID()}`],
    );

    return result.rows[0]!.id;
  }

  async function createContact(
    workspace: WorkspaceFixture,
    accountId: string | null = null,
  ) {
    const result = await pool.query<{ id: string }>(
      "INSERT INTO contacts (workspace_id, user_id, account_id, full_name) VALUES ($1, $2, $3, $4) RETURNING id",
      [workspace.id, workspace.userId, accountId, `Contact ${randomUUID()}`],
    );

    return result.rows[0]!.id;
  }

  async function createLead(
    workspace: WorkspaceFixture,
    options: { accountId?: string | null; primaryContactId?: string | null } = {},
  ) {
    const result = await pool.query<{ id: string }>(
      "INSERT INTO leads (workspace_id, user_id, account_id, primary_contact_id, full_name) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [
        workspace.id,
        workspace.userId,
        options.accountId ?? null,
        options.primaryContactId ?? null,
        `Lead ${randomUUID()}`,
      ],
    );

    return result.rows[0]!.id;
  }

  async function createDeal(
    workspace: WorkspaceFixture,
    options: {
      leadId?: string | null;
      accountId?: string | null;
      contactId?: string | null;
      stage?: "new" | "proposal" | "won" | "lost";
      valueCents?: number;
      currency?: string;
      probability?: number;
      closedAt?: Date | null;
    } = {},
  ) {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO deals (
        workspace_id, user_id, lead_id, account_id, contact_id, name,
        stage, value_cents, currency, probability, closed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        workspace.id,
        workspace.userId,
        options.leadId ?? null,
        options.accountId ?? null,
        options.contactId ?? null,
        `Deal ${randomUUID()}`,
        options.stage ?? "new",
        options.valueCents ?? 0,
        options.currency ?? "USD",
        options.probability ?? 0,
        options.closedAt ?? null,
      ],
    );

    return result.rows[0]!.id;
  }

  async function createTask(
    workspace: WorkspaceFixture,
    options: {
      leadId?: string | null;
      dealId?: string | null;
      contactId?: string | null;
    } = {},
  ) {
    const result = await pool.query<{ id: string }>(
      "INSERT INTO crm_tasks (workspace_id, user_id, lead_id, deal_id, contact_id, title) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [
        workspace.id,
        workspace.userId,
        options.leadId ?? null,
        options.dealId ?? null,
        options.contactId ?? null,
        `Task ${randomUUID()}`,
      ],
    );

    return result.rows[0]!.id;
  }

  async function expectForeignKeyViolation(query: Promise<unknown>) {
    await expect(query).rejects.toMatchObject({ code: "23503" });
  }

  it("rejects cross-workspace contact and lead relationships", async () => {
    const workspaceA = await createWorkspace("A");
    const workspaceB = await createWorkspace("B");
    const accountB = await createAccount(workspaceB);
    const contactB = await createContact(workspaceB, accountB);
    const leadB = await createLead(workspaceB, {
      accountId: accountB,
      primaryContactId: contactB,
    });

    await expectForeignKeyViolation(createContact(workspaceA, accountB));
    await expectForeignKeyViolation(createLead(workspaceA, { accountId: accountB }));
    await expectForeignKeyViolation(
      createLead(workspaceA, { primaryContactId: contactB }),
    );
    await expectForeignKeyViolation(
      pool.query(
        "INSERT INTO lead_notes (workspace_id, user_id, lead_id, content) VALUES ($1, $2, $3, $4)",
        [workspaceA.id, workspaceA.userId, leadB, "Cross-workspace note"],
      ),
    );
    await expectForeignKeyViolation(
      pool.query(
        "INSERT INTO activity_events (workspace_id, user_id, event_type, message, lead_id) VALUES ($1, $2, $3, $4, $5)",
        [
          workspaceA.id,
          workspaceA.userId,
          "lead_created",
          "Cross-workspace activity",
          leadB,
        ],
      ),
    );
  });

  it("rejects cross-workspace deal relationships", async () => {
    const workspaceA = await createWorkspace("A");
    const workspaceB = await createWorkspace("B");
    const accountB = await createAccount(workspaceB);
    const contactB = await createContact(workspaceB, accountB);
    const leadB = await createLead(workspaceB, {
      accountId: accountB,
      primaryContactId: contactB,
    });

    await expectForeignKeyViolation(createDeal(workspaceA, { leadId: leadB }));
    await expectForeignKeyViolation(createDeal(workspaceA, { accountId: accountB }));
    await expectForeignKeyViolation(createDeal(workspaceA, { contactId: contactB }));
  });

  it("rejects cross-workspace task relationships", async () => {
    const workspaceA = await createWorkspace("A");
    const workspaceB = await createWorkspace("B");
    const accountB = await createAccount(workspaceB);
    const contactB = await createContact(workspaceB, accountB);
    const leadB = await createLead(workspaceB, {
      accountId: accountB,
      primaryContactId: contactB,
    });
    const dealB = await createDeal(workspaceB, {
      leadId: leadB,
      accountId: accountB,
      contactId: contactB,
    });

    await expectForeignKeyViolation(createTask(workspaceA, { leadId: leadB }));
    await expectForeignKeyViolation(createTask(workspaceA, { dealId: dealB }));
    await expectForeignKeyViolation(createTask(workspaceA, { contactId: contactB }));
  });

  it("allows valid same-workspace and nullable relationships", async () => {
    const workspace = await createWorkspace("same-workspace");
    const accountId = await createAccount(workspace);
    const contactId = await createContact(workspace, accountId);
    const leadId = await createLead(workspace, { accountId, primaryContactId: contactId });
    const dealId = await createDeal(workspace, { leadId, accountId, contactId });
    const taskId = await createTask(workspace, { leadId, dealId, contactId });

    await pool.query(
      "INSERT INTO lead_notes (workspace_id, user_id, lead_id, content) VALUES ($1, $2, $3, $4)",
      [workspace.id, workspace.userId, leadId, "Tenant-safe note"],
    );
    await pool.query(
      "INSERT INTO activity_events (workspace_id, user_id, event_type, message, lead_id) VALUES ($1, $2, $3, $4, $5)",
      [workspace.id, workspace.userId, "lead_created", "Tenant-safe activity", leadId],
    );

    expect(taskId).toEqual(expect.any(String));
    await expect(createContact(workspace)).resolves.toEqual(expect.any(String));
    await expect(createLead(workspace)).resolves.toEqual(expect.any(String));
    await expect(createDeal(workspace)).resolves.toEqual(expect.any(String));
    await expect(createTask(workspace)).resolves.toEqual(expect.any(String));
  });

  it("allows only one tenant-scoped deal per lead during concurrent inserts", async () => {
    const workspace = await createWorkspace("deal-uniqueness-concurrency");
    const leadId = await createLead(workspace);
    const insertForLead = () =>
      pool.query<{ id: string }>(
        `INSERT INTO deals (workspace_id, user_id, lead_id, name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (workspace_id, lead_id) DO NOTHING
         RETURNING id`,
        [workspace.id, workspace.userId, leadId, `Concurrent deal ${randomUUID()}`],
      );

    const results = await Promise.all([insertForLead(), insertForLead()]);
    const createdCount = results.reduce(
      (count, result) => count + (result.rowCount ?? 0),
      0,
    );
    const persisted = await pool.query<{ count: string }>(
      "SELECT count(*) FROM deals WHERE workspace_id = $1 AND lead_id = $2",
      [workspace.id, leadId],
    );

    expect(createdCount).toBe(1);
    expect(Number(persisted.rows[0]?.count)).toBe(1);
  });

  it("preserves optional relationship cleanup when a parent is deleted", async () => {
    const workspace = await createWorkspace("delete-cleanup");
    const accountId = await createAccount(workspace);
    const contactId = await createContact(workspace, accountId);
    const leadId = await createLead(workspace, { accountId, primaryContactId: contactId });
    const dealId = await createDeal(workspace, { leadId, accountId, contactId });

    await pool.query("DELETE FROM accounts WHERE id = $1", [accountId]);

    const [contact, lead, deal] = await Promise.all([
      pool.query<{ account_id: string | null }>(
        "SELECT account_id FROM contacts WHERE id = $1",
        [contactId],
      ),
      pool.query<{ account_id: string | null }>(
        "SELECT account_id FROM leads WHERE id = $1",
        [leadId],
      ),
      pool.query<{ account_id: string | null }>(
        "SELECT account_id FROM deals WHERE id = $1",
        [dealId],
      ),
    ]);

    expect(contact.rows[0]?.account_id).toBeNull();
    expect(lead.rows[0]?.account_id).toBeNull();
    expect(deal.rows[0]?.account_id).toBeNull();
  });

  it("rejects invalid deal values, probabilities, and lowercase currency", async () => {
    const workspace = await createWorkspace("deal-checks");

    await expect(createDeal(workspace, { valueCents: -1 })).rejects.toMatchObject({
      code: "23514",
      constraint: "deals_value_cents_non_negative_check",
    });
    await expect(createDeal(workspace, { probability: -1 })).rejects.toMatchObject({
      code: "23514",
      constraint: "deals_probability_range_check",
    });
    await expect(createDeal(workspace, { probability: 101 })).rejects.toMatchObject({
      code: "23514",
      constraint: "deals_probability_range_check",
    });
    await expect(createDeal(workspace, { currency: "usd" })).rejects.toMatchObject({
      code: "23514",
      constraint: "deals_currency_uppercase_check",
    });
  });

  it("requires a closed date for final deal stages and allows an atomic stage transition", async () => {
    const workspace = await createWorkspace("deal-stages");

    await expect(createDeal(workspace, { stage: "won" })).rejects.toMatchObject({
      code: "23514",
      constraint: "deals_closed_at_for_final_stage_check",
    });
    await expect(createDeal(workspace, { stage: "lost" })).rejects.toMatchObject({
      code: "23514",
      constraint: "deals_closed_at_for_final_stage_check",
    });

    const dealId = await createDeal(workspace, { stage: "proposal" });
    const updated = await pool.query<{ stage: string; closed_at: Date | null }>(
      "UPDATE deals SET stage = 'won', closed_at = now() WHERE id = $1 RETURNING stage, closed_at",
      [dealId],
    );

    expect(updated.rows[0]).toMatchObject({ stage: "won" });
    expect(updated.rows[0]?.closed_at).toBeInstanceOf(Date);
  });
});
