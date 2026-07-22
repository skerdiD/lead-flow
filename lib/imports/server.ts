import "server-only";

import { createHash } from "node:crypto";
import { clerkClient } from "@clerk/nextjs/server";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  activityEvents,
  contacts,
  importJobs,
  importRows,
  leads,
  workspaceMembers,
} from "@/db/schema";
import { writeAuditEvent } from "@/lib/audit-log.server";
import {
  hasWorkspacePermission,
  permissionDeniedMessage,
} from "@/lib/authorization";
import { requireCurrentUser } from "@/lib/auth";
import { isDemoWorkspace, DEMO_MUTATION_MESSAGE } from "@/lib/demo";
import {
  IMPORT_LIMITS,
  suggestMappings,
  validateMapping,
  type DuplicateStrategy,
  type ImportEntityType,
} from "@/lib/imports/config";
import { buildSafeCsv, readCsvFile } from "@/lib/imports/csv";
import {
  duplicateKey,
  normalizeImportRow,
  normalizedKey,
  type ImportRowError,
} from "@/lib/imports/normalize";
import { logImportEvent } from "@/lib/imports/logging";
import {
  getDuplicateAction,
  getMappedNonBlankFields,
} from "@/lib/imports/processing";
import { getCurrentWorkspace } from "@/lib/workspaces";

type ImportTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class ImportServiceError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "ImportServiceError";
  }
}

function userDisplayName(user: Record<string, unknown>) {
  const firstName = typeof user.firstName === "string" ? user.firstName : "";
  const lastName = typeof user.lastName === "string" ? user.lastName : "";
  const username = typeof user.username === "string" ? user.username : "";
  return [firstName, lastName].filter(Boolean).join(" ") || username || "Workspace user";
}

export async function getImportAuthorization() {
  const [workspace, current] = await Promise.all([
    getCurrentWorkspace(),
    requireCurrentUser(),
  ]);

  if (!hasWorkspacePermission(workspace.role, "crm:import")) {
    throw new ImportServiceError(permissionDeniedMessage("crm:import"), 403);
  }
  if (isDemoWorkspace(workspace)) {
    throw new ImportServiceError(DEMO_MUTATION_MESSAGE, 403);
  }

  return {
    workspace,
    userId: current.userId,
    actorName: userDisplayName(current.user as Record<string, unknown>),
  };
}

export async function purgeExpiredImportRowData(workspaceId: string) {
  const cutoff = new Date(
    Date.now() - IMPORT_LIMITS.stagedDataRetentionDays * 24 * 60 * 60 * 1_000,
  );
  const expiredJobs = db
    .select({ id: importJobs.id })
    .from(importJobs)
    .where(
      and(
        eq(importJobs.workspaceId, workspaceId),
        lt(importJobs.createdAt, cutoff),
      ),
    );

  await db.delete(importRows).where(inArray(importRows.importJobId, expiredJobs));
}

export async function createImportDraft(
  file: File,
  entityType: ImportEntityType,
) {
  const started = Date.now();
  const access = await getImportAuthorization();
  await purgeExpiredImportRowData(access.workspace.id);
  const { bytes, parsed } = await readCsvFile(file);
  const fileHash = createHash("sha256")
    .update(Buffer.from(bytes))
    .digest("hex");

  const job = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(importJobs)
      .values({
        workspaceId: access.workspace.id,
        actorUserId: access.userId,
        actorName: access.actorName,
        entityType,
        originalFileName: file.name.slice(0, 255),
        fileHash,
        totalRows: parsed.rows.length,
      })
      .returning();

    await tx.insert(importRows).values(
      parsed.rows.map((row) => ({
        workspaceId: access.workspace.id,
        importJobId: created.id,
        rowNumber: row.rowNumber,
        rawData: row.values,
      })),
    );

    return created;
  });

  logImportEvent("info", "import_started", {
    requestId: job.requestId,
    workspaceId: access.workspace.id,
    actorUserId: access.userId,
    importJobId: job.id,
    recordType: entityType,
    totalRows: parsed.rows.length,
    durationMs: Date.now() - started,
  });

  return {
    id: job.id,
    entityType,
    fileName: job.originalFileName,
    headers: parsed.headers,
    samples: parsed.headers.map((header) => ({
      header,
      values: parsed.rows
        .slice(0, 3)
        .map((row) => row.values[header])
        .filter(Boolean),
    })),
    suggestedMapping: suggestMappings(entityType, parsed.headers),
    totalRows: parsed.rows.length,
  };
}

async function getWorkspaceMemberDirectory(workspaceId: string) {
  const memberships = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));
  const byEmail = new Map<string, string[]>();
  if (memberships.length === 0) return byEmail;

  try {
    const client = await clerkClient();
    const response = await client.users.getUserList({
      userId: memberships.map((member) => member.userId),
      limit: memberships.length,
    });
    for (const user of response.data) {
      for (const email of user.emailAddresses) {
        const key = normalizedKey(email.emailAddress);
        byEmail.set(key, [...(byEmail.get(key) ?? []), user.id]);
      }
    }
  } catch {
    // Assignment remains optional. A mapped assignment will receive a safe unresolved error.
  }
  return byEmail;
}

function collectValues(
  rows: Array<{ normalized: Record<string, unknown> }>,
  key: string,
) {
  return [
    ...new Set(
      rows
        .map((row) => normalizedKey(row.normalized[key] as string | null))
        .filter(Boolean),
    ),
  ];
}

function appendRelationshipError(
  errors: ImportRowError[],
  field: string,
  value: string,
  matches: unknown[] | undefined,
  label: string,
) {
  if (!matches || matches.length === 0) {
    errors.push({ field, value, message: `${label} was not found in this workspace.` });
  } else if (matches.length > 1) {
    errors.push({ field, value, message: `${label} matches more than one workspace record.` });
  }
}

export async function reviewImportJob(input: {
  jobId: string;
  mapping: Record<string, string | null>;
  duplicateStrategy: DuplicateStrategy;
}) {
  const started = Date.now();
  const access = await getImportAuthorization();
  const [job] = await db
    .select()
    .from(importJobs)
    .where(
      and(
        eq(importJobs.id, input.jobId),
        eq(importJobs.workspaceId, access.workspace.id),
        eq(importJobs.actorUserId, access.userId),
      ),
    )
    .limit(1);

  if (!job) throw new ImportServiceError("This import could not be found.", 404);
  if (!["draft", "reviewed"].includes(job.status)) {
    throw new ImportServiceError("This import can no longer be changed.", 409);
  }

  const stagedRows = await db
    .select()
    .from(importRows)
    .where(
      and(
        eq(importRows.workspaceId, access.workspace.id),
        eq(importRows.importJobId, job.id),
      ),
    )
    .orderBy(asc(importRows.rowNumber));
  const headers = Object.keys(stagedRows[0]?.rawData ?? {});
  const mappingErrors = validateMapping(job.entityType, headers, input.mapping);
  if (mappingErrors.length > 0) {
    throw new ImportServiceError(mappingErrors.join(" "));
  }

  const normalizedRows = stagedRows.map((row) => {
    const result = normalizeImportRow(job.entityType, row.rawData, input.mapping);
    return {
      row,
      normalized: result.normalized as Record<string, unknown>,
      errors: [...result.errors],
    };
  });

  const assignedMemberEmails = collectValues(normalizedRows, "assignedUserEmail");
  const [memberDirectory, accountRows, contactRows, duplicateRows] =
    await Promise.all([
      assignedMemberEmails.length > 0
        ? getWorkspaceMemberDirectory(access.workspace.id)
        : Promise.resolve(new Map<string, string[]>()),
      (async () => {
        const names = collectValues(normalizedRows, "accountName");
        if (names.length === 0) return [];
        return db
          .select({ id: accounts.id, name: accounts.name })
          .from(accounts)
          .where(
            and(
              eq(accounts.workspaceId, access.workspace.id),
              eq(accounts.isArchived, false),
              inArray(sql<string>`lower(trim(${accounts.name}))`, names),
            ),
          );
      })(),
      (async () => {
        const emails = collectValues(normalizedRows, "primaryContactEmail");
        if (emails.length === 0) return [];
        return db
          .select({ id: contacts.id, email: contacts.email })
          .from(contacts)
          .where(
            and(
              eq(contacts.workspaceId, access.workspace.id),
              eq(contacts.isArchived, false),
              inArray(sql<string>`lower(trim(${contacts.email}))`, emails),
            ),
          );
      })(),
      (async () => {
        const keys = [
          ...new Set(
            normalizedRows
              .map((row) => duplicateKey(job.entityType, row.normalized))
              .filter(Boolean),
          ),
        ];
        if (keys.length === 0) return [];
        if (job.entityType === "account") {
          return db
            .select({ id: accounts.id, key: sql<string>`lower(trim(${accounts.name}))` })
            .from(accounts)
            .where(
              and(
                eq(accounts.workspaceId, access.workspace.id),
                inArray(sql<string>`lower(trim(${accounts.name}))`, keys),
              ),
            );
        }
        if (job.entityType === "contact") {
          return db
            .select({ id: contacts.id, key: sql<string>`lower(trim(${contacts.email}))` })
            .from(contacts)
            .where(
              and(
                eq(contacts.workspaceId, access.workspace.id),
                inArray(sql<string>`lower(trim(${contacts.email}))`, keys),
              ),
            );
        }
        return db
          .select({ id: leads.id, key: sql<string>`lower(trim(${leads.email}))` })
          .from(leads)
          .where(
            and(
              eq(leads.workspaceId, access.workspace.id),
              inArray(sql<string>`lower(trim(${leads.email}))`, keys),
            ),
          );
      })(),
    ]);

  const accountsByName = new Map<string, typeof accountRows>();
  for (const account of accountRows) {
    const key = normalizedKey(account.name);
    accountsByName.set(key, [...(accountsByName.get(key) ?? []), account]);
  }
  const contactsByEmail = new Map<string, typeof contactRows>();
  for (const contact of contactRows) {
    const key = normalizedKey(contact.email);
    contactsByEmail.set(key, [...(contactsByEmail.get(key) ?? []), contact]);
  }
  const duplicatesByKey = new Map<string, typeof duplicateRows>();
  for (const duplicate of duplicateRows) {
    duplicatesByKey.set(duplicate.key, [
      ...(duplicatesByKey.get(duplicate.key) ?? []),
      duplicate,
    ]);
  }

  const seenKeys = new Set<string>();
  const reviewed = normalizedRows.map(({ row, normalized, errors }) => {
    const resolved = { ...normalized } as Record<string, unknown>;
    const warnings: string[] = [];
    const accountName = normalizedKey(normalized.accountName as string | null);
    if (accountName) {
      const matches = accountsByName.get(accountName);
      appendRelationshipError(
        errors,
        "accountName",
        String(normalized.accountName),
        matches,
        "Account",
      );
      if (matches?.length === 1) resolved.accountId = matches[0].id;
    }

    const contactEmail = normalizedKey(
      normalized.primaryContactEmail as string | null,
    );
    if (contactEmail) {
      const matches = contactsByEmail.get(contactEmail);
      appendRelationshipError(
        errors,
        "primaryContactEmail",
        String(normalized.primaryContactEmail),
        matches,
        "Primary contact",
      );
      if (matches?.length === 1) resolved.primaryContactId = matches[0].id;
    }

    const assignedEmail = normalizedKey(
      normalized.assignedUserEmail as string | null,
    );
    if (assignedEmail) {
      const matches = memberDirectory.get(assignedEmail);
      appendRelationshipError(
        errors,
        "assignedUserEmail",
        String(normalized.assignedUserEmail),
        matches,
        "Assigned team member",
      );
      if (matches?.length === 1) resolved.assignedOwnerUserId = matches[0];
    } else {
      resolved.assignedOwnerUserId = access.userId;
    }

    const key = duplicateKey(job.entityType, normalized);
    const existingMatches = key ? duplicatesByKey.get(key) : undefined;
    if (existingMatches && existingMatches.length > 1) {
      errors.push({
        field: job.entityType === "account" ? "name" : "email",
        value: key,
        message: "This value matches more than one existing workspace record.",
      });
    }

    let duplicateKind: string | null = null;
    let existingRecordId: string | null = null;
    if (errors.length === 0 && existingMatches?.length === 1) {
      duplicateKind = "exact_existing";
      existingRecordId = existingMatches[0].id;
    } else if (errors.length === 0 && key && seenKeys.has(key)) {
      duplicateKind = "within_file";
      warnings.push("Another row in this CSV has the same duplicate key.");
    }
    if (key) seenKeys.add(key);

    return {
      id: row.id,
      normalized: resolved,
      errors,
      warnings,
      status:
        errors.length > 0
          ? ("invalid" as const)
          : duplicateKind
            ? ("duplicate" as const)
            : ("ready" as const),
      duplicateKind,
      existingRecordId,
    };
  });

  const invalidRows = reviewed.filter((row) => row.status === "invalid").length;
  const duplicateCount = reviewed.filter((row) => row.status === "duplicate").length;
  const validRows = reviewed.length - invalidRows;

  await db.transaction(async (tx) => {
    for (const row of reviewed) {
      await tx
        .update(importRows)
        .set({
          normalizedData: row.normalized,
          errors: row.errors,
          warnings: row.warnings,
          status: row.status,
          duplicateKind: row.duplicateKind,
          existingRecordId: row.existingRecordId,
          createdRecordId: null,
          updatedAt: new Date(),
        })
        .where(eq(importRows.id, row.id));
    }
    await tx
      .update(importJobs)
      .set({
        status: "reviewed",
        mapping: input.mapping,
        duplicateStrategy: input.duplicateStrategy,
        validRows,
        invalidRows,
        duplicateRows: duplicateCount,
        importedRows: 0,
        updatedRows: 0,
        skippedRows: 0,
        failedRows: 0,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(importJobs.id, job.id));
  });

  logImportEvent("info", "import_validation_completed", {
    requestId: job.requestId,
    workspaceId: access.workspace.id,
    actorUserId: access.userId,
    importJobId: job.id,
    recordType: job.entityType,
    totalRows: job.totalRows,
    validRows,
    invalidRows,
    duplicateRows: duplicateCount,
    durationMs: Date.now() - started,
  });

  return getImportJobDetails(job.id, { page: 1, filter: "all" });
}

async function processImportRow(
  tx: ImportTx,
  job: typeof importJobs.$inferSelect,
  row: typeof importRows.$inferSelect,
) {
  const data = row.normalizedData ?? {};
  const strategy = job.duplicateStrategy ?? "skip";
  const isDuplicate = row.status === "duplicate";
  const duplicateAction = getDuplicateAction({
    isDuplicate,
    strategy,
    existingRecordId: row.existingRecordId,
  });

  if (duplicateAction === "skip") {
    await tx
      .update(importRows)
      .set({ status: "skipped", updatedAt: new Date() })
      .where(eq(importRows.id, row.id));
    return "skipped" as const;
  }

  const updateExisting = duplicateAction === "update";
  const nonBlank = getMappedNonBlankFields(row.rawData, job.mapping ?? {});
  let recordId = row.existingRecordId;

  if (job.entityType === "account") {
    if (updateExisting) {
      const values: Partial<typeof accounts.$inferInsert> = { updatedAt: new Date() };
      if (nonBlank.has("name")) values.name = String(data.name);
      if (nonBlank.has("website")) values.website = (data.website as string | null) ?? null;
      if (nonBlank.has("industry")) values.industry = (data.industry as string | null) ?? null;
      if (nonBlank.has("assignedUserEmail")) {
        values.assignedOwnerUserId = (data.assignedOwnerUserId as string | null) ?? null;
      }
      const [updated] = await tx
        .update(accounts)
        .set(values)
        .where(
          and(
            eq(accounts.id, row.existingRecordId!),
            eq(accounts.workspaceId, job.workspaceId),
          ),
        )
        .returning({ id: accounts.id });
      recordId = updated?.id ?? null;
    } else {
      const [created] = await tx
        .insert(accounts)
        .values({
          workspaceId: job.workspaceId,
          userId: job.actorUserId,
          assignedOwnerUserId: data.assignedOwnerUserId as string,
          name: String(data.name),
          website: (data.website as string | null) ?? null,
          industry: (data.industry as string | null) ?? null,
        })
        .returning({ id: accounts.id });
      recordId = created.id;
    }
  } else if (job.entityType === "contact") {
    const accountId = (data.accountId as string | null) ?? null;
    if (data.isPrimary && accountId) {
      await tx
        .update(contacts)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(
          and(
            eq(contacts.workspaceId, job.workspaceId),
            eq(contacts.accountId, accountId),
          ),
        );
    }
    if (updateExisting) {
      const values: Partial<typeof contacts.$inferInsert> = { updatedAt: new Date() };
      if (nonBlank.has("fullName") || nonBlank.has("firstName")) values.fullName = String(data.fullName);
      if (nonBlank.has("email")) values.email = (data.email as string | null) ?? null;
      if (nonBlank.has("phone")) values.phone = (data.phone as string | null) ?? null;
      if (nonBlank.has("title")) values.title = (data.title as string | null) ?? null;
      if (nonBlank.has("accountName")) values.accountId = accountId;
      if (nonBlank.has("assignedUserEmail")) {
        values.assignedOwnerUserId = data.assignedOwnerUserId as string;
      }
      if (nonBlank.has("isPrimary")) values.isPrimary = Boolean(data.isPrimary && accountId);
      const [updated] = await tx
        .update(contacts)
        .set(values)
        .where(
          and(
            eq(contacts.id, row.existingRecordId!),
            eq(contacts.workspaceId, job.workspaceId),
          ),
        )
        .returning({ id: contacts.id });
      recordId = updated?.id ?? null;
    } else {
      const [created] = await tx
        .insert(contacts)
        .values({
          workspaceId: job.workspaceId,
          userId: job.actorUserId,
          assignedOwnerUserId: data.assignedOwnerUserId as string,
          accountId,
          fullName: String(data.fullName),
          email: (data.email as string | null) ?? null,
          phone: (data.phone as string | null) ?? null,
          title: (data.title as string | null) ?? null,
          isPrimary: Boolean(data.isPrimary && accountId),
        })
        .returning({ id: contacts.id });
      recordId = created.id;
    }
  } else {
    if (updateExisting) {
      const values: Partial<typeof leads.$inferInsert> = { updatedAt: new Date() };
      if (nonBlank.has("fullName") || nonBlank.has("firstName")) values.fullName = String(data.fullName);
      if (nonBlank.has("company")) values.company = (data.company as string | null) ?? null;
      if (nonBlank.has("email")) values.email = (data.email as string | null) ?? null;
      if (nonBlank.has("phone")) values.phone = (data.phone as string | null) ?? null;
      if (nonBlank.has("status")) values.status = data.status as typeof leads.$inferInsert.status;
      if (nonBlank.has("source")) values.source = (data.source as string | null) ?? null;
      if (nonBlank.has("notes")) values.notes = (data.notes as string | null) ?? null;
      if (nonBlank.has("accountName")) values.accountId = (data.accountId as string | null) ?? null;
      if (nonBlank.has("primaryContactEmail")) {
        values.primaryContactId = (data.primaryContactId as string | null) ?? null;
      }
      if (nonBlank.has("assignedUserEmail")) {
        values.assignedOwnerUserId = data.assignedOwnerUserId as string;
      }
      if (nonBlank.has("nextFollowUpDate")) {
        values.nextFollowUpDate = data.nextFollowUpDate
          ? new Date(`${data.nextFollowUpDate}T00:00:00.000Z`)
          : null;
      }
      if (nonBlank.has("followUpNote")) values.followUpNote = (data.followUpNote as string | null) ?? null;
      if (nonBlank.has("followUpPriority")) {
        values.followUpPriority = data.followUpPriority as typeof leads.$inferInsert.followUpPriority;
      }
      if (nonBlank.has("followUpStatus")) {
        values.followUpStatus = data.followUpStatus as typeof leads.$inferInsert.followUpStatus;
      }
      const [updated] = await tx
        .update(leads)
        .set(values)
        .where(
          and(
            eq(leads.id, row.existingRecordId!),
            eq(leads.workspaceId, job.workspaceId),
          ),
        )
        .returning({ id: leads.id });
      recordId = updated?.id ?? null;
    } else {
      const [created] = await tx
        .insert(leads)
        .values({
          workspaceId: job.workspaceId,
          userId: job.actorUserId,
          assignedOwnerUserId: data.assignedOwnerUserId as string,
          accountId: (data.accountId as string | null) ?? null,
          primaryContactId: (data.primaryContactId as string | null) ?? null,
          fullName: String(data.fullName),
          company: (data.company as string | null) ?? null,
          email: (data.email as string | null) ?? null,
          phone: (data.phone as string | null) ?? null,
          status: data.status as typeof leads.$inferInsert.status,
          source: (data.source as string | null) ?? null,
          notes: (data.notes as string | null) ?? null,
          nextFollowUpDate: data.nextFollowUpDate
            ? new Date(`${data.nextFollowUpDate}T00:00:00.000Z`)
            : null,
          followUpNote: (data.followUpNote as string | null) ?? null,
          followUpPriority:
            data.followUpPriority as typeof leads.$inferInsert.followUpPriority,
          followUpStatus:
            data.followUpStatus as typeof leads.$inferInsert.followUpStatus,
        })
        .returning({ id: leads.id });
      recordId = created.id;
    }
  }

  if (!recordId) throw new Error("The CRM record could not be saved.");
  const finalStatus = updateExisting ? "updated" : "imported";
  await tx
    .update(importRows)
    .set({
      status: finalStatus,
      createdRecordId: recordId,
      updatedAt: new Date(),
    })
    .where(eq(importRows.id, row.id));
  return finalStatus;
}

async function refreshJobCounts(tx: ImportTx, jobId: string) {
  const counts = await tx
    .select({
      status: importRows.status,
      count: sql<number>`count(*)`,
    })
    .from(importRows)
    .where(eq(importRows.importJobId, jobId))
    .groupBy(importRows.status);
  const byStatus = new Map(counts.map((row) => [row.status, Number(row.count)]));
  const values = {
    importedRows: byStatus.get("imported") ?? 0,
    updatedRows: byStatus.get("updated") ?? 0,
    skippedRows: byStatus.get("skipped") ?? 0,
    failedRows: byStatus.get("failed") ?? 0,
    updatedAt: new Date(),
  };
  await tx.update(importJobs).set(values).where(eq(importJobs.id, jobId));
  return values;
}

export async function confirmImportJob(jobId: string) {
  const started = Date.now();
  const access = await getImportAuthorization();
  const [existing] = await db
    .select()
    .from(importJobs)
    .where(
      and(
        eq(importJobs.id, jobId),
        eq(importJobs.workspaceId, access.workspace.id),
        eq(importJobs.actorUserId, access.userId),
      ),
    )
    .limit(1);
  if (!existing) throw new ImportServiceError("This import could not be found.", 404);
  if (existing.status === "completed") return getImportJobDetails(jobId);
  if (existing.status === "processing") {
    throw new ImportServiceError("This import is already processing.", 409);
  }
  if (!["reviewed", "failed"].includes(existing.status)) {
    throw new ImportServiceError("Review the import before confirming it.", 409);
  }

  const [job] = await db
    .update(importJobs)
    .set({
      status: "processing",
      startedAt: existing.startedAt ?? new Date(),
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(importJobs.id, jobId),
        eq(importJobs.workspaceId, access.workspace.id),
        inArray(importJobs.status, ["reviewed", "failed"]),
      ),
    )
    .returning();
  if (!job) throw new ImportServiceError("This import is already processing.", 409);

  try {
    const pendingRows = await db
      .select()
      .from(importRows)
      .where(
        and(
          eq(importRows.workspaceId, access.workspace.id),
          eq(importRows.importJobId, job.id),
          or(eq(importRows.status, "ready"), eq(importRows.status, "duplicate")),
        ),
      )
      .orderBy(asc(importRows.rowNumber));

    for (let offset = 0; offset < pendingRows.length; offset += IMPORT_LIMITS.batchSize) {
      const batch = pendingRows.slice(offset, offset + IMPORT_LIMITS.batchSize);
      try {
        await db.transaction(async (tx) => {
          for (const row of batch) await processImportRow(tx, job, row);
        });
      } catch (batchError) {
        for (const row of batch) {
          try {
            await db.transaction(async (tx) => {
              await processImportRow(tx, job, row);
            });
          } catch {
            await db.transaction(async (tx) => {
              await tx
                .update(importRows)
                .set({
                  status: "failed",
                  errors: [
                    {
                      field: "row",
                      message: "This row could not be saved. No database details were exposed.",
                    },
                  ],
                  updatedAt: new Date(),
                })
                .where(eq(importRows.id, row.id));
            });
          }
        }
        logImportEvent("warn", "import_batch_recovered", {
          requestId: job.requestId,
          workspaceId: job.workspaceId,
          actorUserId: job.actorUserId,
          importJobId: job.id,
          recordType: job.entityType,
          batchOffset: offset,
          batchSize: batch.length,
          errorName:
            batchError instanceof Error ? batchError.name : "UnknownError",
        });
      }

      logImportEvent("info", "import_batch_completed", {
        requestId: job.requestId,
        workspaceId: job.workspaceId,
        actorUserId: job.actorUserId,
        importJobId: job.id,
        recordType: job.entityType,
        batchOffset: offset,
        batchSize: batch.length,
      });
    }

    const counts = await db.transaction(async (tx) => {
      const refreshed = await refreshJobCounts(tx, job.id);
      const completedAt = new Date();
      await tx
        .update(importJobs)
        .set({ status: "completed", completedAt, updatedAt: completedAt })
        .where(eq(importJobs.id, job.id));
      await tx.insert(activityEvents).values({
        workspaceId: job.workspaceId,
        userId: job.actorUserId,
        eventType: "crm_import_completed",
        message: `${job.actorName} imported ${refreshed.importedRows + refreshed.updatedRows} ${job.entityType}${refreshed.importedRows + refreshed.updatedRows === 1 ? "" : "s"} from ${job.originalFileName}.`.slice(0, 255),
      });
      await writeAuditEvent({
        tx,
        workspaceId: job.workspaceId,
        actor: { userId: job.actorUserId, role: "system" },
        action: "crm.import.completed",
        entity: { type: "import", id: job.id },
        requestId: job.requestId,
        metadata: {
          importJobId: job.id,
          fileName: job.originalFileName,
          fileHash: job.fileHash,
          mapping: job.mapping,
          duplicateStrategy: job.duplicateStrategy,
          ...refreshed,
        },
        eventKey: `import-completed:${job.id}`,
      });
      return refreshed;
    });

    logImportEvent("info", "import_completed", {
      requestId: job.requestId,
      workspaceId: job.workspaceId,
      actorUserId: job.actorUserId,
      importJobId: job.id,
      recordType: job.entityType,
      ...counts,
      durationMs: Date.now() - started,
    });
    return getImportJobDetails(job.id);
  } catch (error) {
    try {
      await db.transaction((tx) => refreshJobCounts(tx, job.id));
    } catch {
      // Preserve the original import failure even if its diagnostic recount fails.
    }
    await db
      .update(importJobs)
      .set({
        status: "failed",
        errorMessage: "The import stopped because of an unexpected system error.",
        updatedAt: new Date(),
      })
      .where(eq(importJobs.id, job.id));
    logImportEvent("error", "import_failed", {
      requestId: job.requestId,
      workspaceId: job.workspaceId,
      actorUserId: job.actorUserId,
      importJobId: job.id,
      recordType: job.entityType,
      errorName: error instanceof Error ? error.name : "UnknownError",
      durationMs: Date.now() - started,
    });
    throw new ImportServiceError(
      "The import stopped safely. You can retry without duplicating completed rows.",
      500,
    );
  }
}

export async function getImportJobDetails(
  jobId: string,
  options?: { page?: number; filter?: string },
) {
  const access = await getImportAuthorization();
  const [job] = await db
    .select()
    .from(importJobs)
    .where(
      and(
        eq(importJobs.id, jobId),
        eq(importJobs.workspaceId, access.workspace.id),
      ),
    )
    .limit(1);
  if (!job) throw new ImportServiceError("This import could not be found.", 404);

  const page = Math.max(1, options?.page ?? 1);
  const filter = options?.filter ?? "all";
  const conditions = [
    eq(importRows.workspaceId, access.workspace.id),
    eq(importRows.importJobId, job.id),
  ];
  if (filter === "ready") conditions.push(eq(importRows.status, "ready"));
  if (filter === "duplicate") conditions.push(eq(importRows.status, "duplicate"));
  if (filter === "invalid") conditions.push(eq(importRows.status, "invalid"));
  if (filter === "warning") {
    conditions.push(sql`jsonb_array_length(coalesce(${importRows.warnings}, '[]'::jsonb)) > 0`);
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(importRows)
    .where(and(...conditions));
  const total = Number(countRow?.count ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / IMPORT_LIMITS.previewPageSize));
  const resolvedPage = Math.min(page, pageCount);
  const rows = await db
    .select({
      id: importRows.id,
      rowNumber: importRows.rowNumber,
      status: importRows.status,
      rawData: importRows.rawData,
      normalizedData: importRows.normalizedData,
      errors: importRows.errors,
      warnings: importRows.warnings,
      duplicateKind: importRows.duplicateKind,
    })
    .from(importRows)
    .where(and(...conditions))
    .orderBy(asc(importRows.rowNumber))
    .limit(IMPORT_LIMITS.previewPageSize)
    .offset((resolvedPage - 1) * IMPORT_LIMITS.previewPageSize);

  return {
    job: {
      ...job,
      idempotencyKey: undefined,
      fileHash: undefined,
      requestId: undefined,
    },
    rows,
    pagination: {
      page: resolvedPage,
      pageCount,
      total,
      pageSize: IMPORT_LIMITS.previewPageSize,
      filter,
    },
  };
}

export async function getImportHistory(params: { search?: string; status?: string; entityType?: string; page?: string } = {}) {
  const access = await getImportAuthorization();
  const search = params.search?.trim().slice(0, 120) ?? "";
  const allowedStatuses = ["draft", "reviewed", "processing", "completed", "failed"] as const;
  const allowedEntityTypes = ["lead", "account", "contact"] as const;
  const status = allowedStatuses.includes(params.status as (typeof allowedStatuses)[number]) ? params.status! : "";
  const entityType = allowedEntityTypes.includes(params.entityType as (typeof allowedEntityTypes)[number]) ? params.entityType! : "";
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 20;
  const conditions = [eq(importJobs.workspaceId, access.workspace.id)];
  if (search) conditions.push(or(ilike(importJobs.originalFileName, `%${search}%`), ilike(importJobs.actorName, `%${search}%`))!);
  if (status) conditions.push(eq(importJobs.status, status as typeof importJobs.$inferSelect.status));
  if (entityType) conditions.push(eq(importJobs.entityType, entityType as typeof importJobs.$inferSelect.entityType));
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(importJobs).where(and(...conditions));
  const totalCount = Number(countRow?.count ?? 0);
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const jobs = await db
    .select({
      id: importJobs.id,
      originalFileName: importJobs.originalFileName,
      entityType: importJobs.entityType,
      actorName: importJobs.actorName,
      status: importJobs.status,
      importedRows: importJobs.importedRows,
      updatedRows: importJobs.updatedRows,
      skippedRows: importJobs.skippedRows,
      failedRows: importJobs.failedRows,
      startedAt: importJobs.startedAt,
      completedAt: importJobs.completedAt,
      createdAt: importJobs.createdAt,
    })
    .from(importJobs)
    .where(and(...conditions))
    .orderBy(desc(importJobs.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return { jobs, totalCount, page, pageCount, pageSize, filters: { search, status, entityType } };
}

export async function buildRejectedRowsCsv(jobId: string) {
  const access = await getImportAuthorization();
  const [job] = await db
    .select()
    .from(importJobs)
    .where(
      and(
        eq(importJobs.id, jobId),
        eq(importJobs.workspaceId, access.workspace.id),
      ),
    )
    .limit(1);
  if (!job) throw new ImportServiceError("This import could not be found.", 404);

  const rows = await db
    .select({
      rowNumber: importRows.rowNumber,
      rawData: importRows.rawData,
      errors: importRows.errors,
    })
    .from(importRows)
    .where(
      and(
        eq(importRows.workspaceId, access.workspace.id),
        eq(importRows.importJobId, job.id),
        or(eq(importRows.status, "invalid"), eq(importRows.status, "failed")),
      ),
    )
    .orderBy(asc(importRows.rowNumber));
  if (rows.length === 0) {
    throw new ImportServiceError("This import has no rejected rows.", 404);
  }

  const headers = Object.keys(rows[0].rawData);
  return {
    fileName: `leadflow-rejected-${job.entityType}-${job.id}.csv`,
    csv: buildSafeCsv([
      ["CSV Row", ...headers, "Import errors"],
      ...rows.map((row) => [
        String(row.rowNumber),
        ...headers.map((header) => row.rawData[header] ?? ""),
        (row.errors ?? []).map((error) => `${error.field}: ${error.message}`).join("; "),
      ]),
    ]),
  };
}
