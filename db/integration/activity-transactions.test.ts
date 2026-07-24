import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import { createLeadActivity } from "@/app/dashboard/leads/services/activity-service";
import { createCrmActivity } from "@/lib/crm-activity.server";
import { writeAuditEvent } from "@/lib/audit-log.server";

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
      await pool.query("DELETE FROM audit_logs WHERE workspace_id = ANY($1::uuid[])", [
        createdWorkspaceIds,
      ]);
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

  it("commits an account with its required activity and audit history", async () => {
    const workspace = await createWorkspace("account-create-commit");
    const accountName = `Atomic account ${randomUUID()}`;

    const accountId = await database.transaction(async (tx) => {
      const [account] = await tx.insert(schema.accounts).values({
        workspaceId: workspace.id,
        userId: workspace.userId,
        assignedOwnerUserId: workspace.userId,
        name: accountName,
      }).returning({ id: schema.accounts.id });
      await createCrmActivity({ client: tx, workspaceId: workspace.id, userId: workspace.userId, eventType: "account_created", message: `Account created: ${accountName}`, accountId: account.id });
      await writeAuditEvent({ tx, workspaceId: workspace.id, actor: { userId: workspace.userId, role: "owner" }, action: "account.created", entity: { type: "account", id: account.id }, after: { name: accountName }, requestId: randomUUID() });
      return account.id;
    });

    const [account, activities, audits] = await Promise.all([
      pool.query("SELECT id FROM accounts WHERE id = $1 AND workspace_id = $2", [accountId, workspace.id]),
      pool.query("SELECT id FROM activity_events WHERE account_id = $1 AND workspace_id = $2", [accountId, workspace.id]),
      pool.query("SELECT id FROM audit_logs WHERE entity_id = $1 AND workspace_id = $2 AND action = 'account.created'", [accountId, workspace.id]),
    ]);
    expect(account.rows).toHaveLength(1);
    expect(activities.rows).toHaveLength(1);
    expect(audits.rows).toHaveLength(1);
  });

  it("rolls back account creation when its required activity fails", async () => {
    const workspace = await createWorkspace("account-create-rollback");

    await expect(database.transaction(async (tx) => {
      const [account] = await tx.insert(schema.accounts).values({ workspaceId: workspace.id, userId: workspace.userId, name: `Rollback account ${randomUUID()}` }).returning({ id: schema.accounts.id });
      await createCrmActivity({ client: tx, workspaceId: workspace.id, userId: workspace.userId, eventType: "account_created", message: "x".repeat(256), accountId: account.id });
    })).rejects.toBeDefined();

    const [accounts, activities] = await Promise.all([
      pool.query("SELECT id FROM accounts WHERE workspace_id = $1", [workspace.id]),
      pool.query("SELECT id FROM activity_events WHERE workspace_id = $1", [workspace.id]),
    ]);
    expect(accounts.rows).toHaveLength(0);
    expect(activities.rows).toHaveLength(0);
  });

  it("commits an account update and activity atomically", async () => {
    const workspace = await createWorkspace("account-update-commit");
    const [account] = await database.insert(schema.accounts).values({ workspaceId: workspace.id, userId: workspace.userId, name: "Before account" }).returning({ id: schema.accounts.id });

    await database.transaction(async (tx) => {
      await tx.update(schema.accounts).set({ name: "After account", updatedAt: new Date() }).where(eq(schema.accounts.id, account.id));
      await createCrmActivity({ client: tx, workspaceId: workspace.id, userId: workspace.userId, eventType: "account_updated", message: "Account updated: After account", accountId: account.id });
    });

    const [row, activities] = await Promise.all([
      pool.query<{ name: string }>("SELECT name FROM accounts WHERE id = $1", [account.id]),
      pool.query("SELECT id FROM activity_events WHERE account_id = $1 AND event_type = 'account_updated'", [account.id]),
    ]);
    expect(row.rows[0]?.name).toBe("After account");
    expect(activities.rows).toHaveLength(1);
  });

  it("restores the previous account state when update activity fails", async () => {
    const workspace = await createWorkspace("account-update-rollback");
    const [account] = await database.insert(schema.accounts).values({ workspaceId: workspace.id, userId: workspace.userId, name: "Original account" }).returning({ id: schema.accounts.id });

    await expect(database.transaction(async (tx) => {
      await tx.update(schema.accounts).set({ name: "Must roll back", updatedAt: new Date() }).where(eq(schema.accounts.id, account.id));
      await createCrmActivity({ client: tx, workspaceId: workspace.id, userId: workspace.userId, eventType: "account_updated", message: "x".repeat(256), accountId: account.id });
    })).rejects.toBeDefined();

    const row = await pool.query<{ name: string }>("SELECT name FROM accounts WHERE id = $1", [account.id]);
    expect(row.rows[0]?.name).toBe("Original account");
  });

  it("commits a contact with its required activity and audit history", async () => {
    const workspace = await createWorkspace("contact-create-commit");

    const contactId = await database.transaction(async (tx) => {
      const [contact] = await tx.insert(schema.contacts).values({ workspaceId: workspace.id, userId: workspace.userId, fullName: "Atomic contact" }).returning({ id: schema.contacts.id });
      await createCrmActivity({ client: tx, workspaceId: workspace.id, userId: workspace.userId, eventType: "contact_created", message: "Contact created: Atomic contact", contactId: contact.id });
      await writeAuditEvent({ tx, workspaceId: workspace.id, actor: { userId: workspace.userId, role: "owner" }, action: "contact.created", entity: { type: "contact", id: contact.id }, after: { fullName: "Atomic contact" }, requestId: randomUUID() });
      return contact.id;
    });

    const [contact, activities, audits] = await Promise.all([
      pool.query("SELECT id FROM contacts WHERE id = $1 AND workspace_id = $2", [contactId, workspace.id]),
      pool.query("SELECT id FROM activity_events WHERE contact_id = $1 AND workspace_id = $2", [contactId, workspace.id]),
      pool.query("SELECT id FROM audit_logs WHERE entity_id = $1 AND workspace_id = $2 AND action = 'contact.created'", [contactId, workspace.id]),
    ]);
    expect(contact.rows).toHaveLength(1);
    expect(activities.rows).toHaveLength(1);
    expect(audits.rows).toHaveLength(1);
  });

  it("rolls back contact creation when its required activity fails", async () => {
    const workspace = await createWorkspace("contact-create-rollback");

    await expect(database.transaction(async (tx) => {
      const [contact] = await tx.insert(schema.contacts).values({ workspaceId: workspace.id, userId: workspace.userId, fullName: "Rollback contact" }).returning({ id: schema.contacts.id });
      await createCrmActivity({ client: tx, workspaceId: workspace.id, userId: workspace.userId, eventType: "contact_created", message: "x".repeat(256), contactId: contact.id });
    })).rejects.toBeDefined();

    const contacts = await pool.query("SELECT id FROM contacts WHERE workspace_id = $1", [workspace.id]);
    expect(contacts.rows).toHaveLength(0);
  });

  it("commits a contact update and activity atomically", async () => {
    const workspace = await createWorkspace("contact-update-commit");
    const [contact] = await database.insert(schema.contacts).values({ workspaceId: workspace.id, userId: workspace.userId, fullName: "Before contact" }).returning({ id: schema.contacts.id });

    await database.transaction(async (tx) => {
      await tx.update(schema.contacts).set({ fullName: "After contact", updatedAt: new Date() }).where(eq(schema.contacts.id, contact.id));
      await createCrmActivity({ client: tx, workspaceId: workspace.id, userId: workspace.userId, eventType: "contact_updated", message: "Contact updated: After contact", contactId: contact.id });
    });

    const [row, activities] = await Promise.all([
      pool.query<{ full_name: string }>("SELECT full_name FROM contacts WHERE id = $1", [contact.id]),
      pool.query("SELECT id FROM activity_events WHERE contact_id = $1 AND event_type = 'contact_updated'", [contact.id]),
    ]);
    expect(row.rows[0]?.full_name).toBe("After contact");
    expect(activities.rows).toHaveLength(1);
  });

  it("restores the previous contact state when update activity fails", async () => {
    const workspace = await createWorkspace("contact-update-rollback");
    const [contact] = await database.insert(schema.contacts).values({ workspaceId: workspace.id, userId: workspace.userId, fullName: "Original contact" }).returning({ id: schema.contacts.id });

    await expect(database.transaction(async (tx) => {
      await tx.update(schema.contacts).set({ fullName: "Must roll back", updatedAt: new Date() }).where(eq(schema.contacts.id, contact.id));
      await createCrmActivity({ client: tx, workspaceId: workspace.id, userId: workspace.userId, eventType: "contact_updated", message: "x".repeat(256), contactId: contact.id });
    })).rejects.toBeDefined();

    const row = await pool.query<{ full_name: string }>("SELECT full_name FROM contacts WHERE id = $1", [contact.id]);
    expect(row.rows[0]?.full_name).toBe("Original contact");
  });

  it("rolls back a domain mutation when required audit logging fails", async () => {
    const workspace = await createWorkspace("audit-rollback");

    await expect(database.transaction(async (tx) => {
      const [account] = await tx.insert(schema.accounts).values({ workspaceId: workspace.id, userId: workspace.userId, name: "Audit rollback" }).returning({ id: schema.accounts.id });
      await writeAuditEvent({ tx, workspaceId: workspace.id, actor: { userId: "x".repeat(256), role: "owner" }, action: "account.created", entity: { type: "account", id: account.id }, requestId: randomUUID() });
    })).rejects.toBeDefined();

    const accounts = await pool.query("SELECT id FROM accounts WHERE workspace_id = $1", [workspace.id]);
    expect(accounts.rows).toHaveLength(0);
  });

  it("rejects a cross-workspace contact relationship without a partial contact", async () => {
    const current = await createWorkspace("contact-tenant-current");
    const other = await createWorkspace("contact-tenant-other");
    const [otherAccount] = await database.insert(schema.accounts).values({ workspaceId: other.id, userId: other.userId, name: "Other account" }).returning({ id: schema.accounts.id });

    await expect(database.transaction(async (tx) => {
      await tx.insert(schema.contacts).values({ workspaceId: current.id, userId: current.userId, accountId: otherAccount.id, fullName: "Invalid cross-tenant contact" });
    })).rejects.toBeDefined();

    const contacts = await pool.query("SELECT id FROM contacts WHERE workspace_id = $1", [current.id]);
    expect(contacts.rows).toHaveLength(0);
  });
});
