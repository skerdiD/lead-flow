import "server-only";

import { createHash } from "node:crypto";
import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { idempotencyRecords } from "@/db/schema";
import type { DatabaseClient } from "@/lib/db-client";

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;

export class IdempotencyConflictError extends Error {
  readonly code = "idempotency_conflict";

  constructor() {
    super("This idempotency key was already used with different request data.");
    this.name = "IdempotencyConflictError";
  }
}

export class InvalidIdempotencyKeyError extends Error {
  readonly code = "invalid_idempotency_key";

  constructor() {
    super("A valid idempotency key is required.");
    this.name = "InvalidIdempotencyKeyError";
  }
}

function canonicalize(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

export function fingerprintIdempotentRequest(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

export type IdempotentMutationResult<T> = {
  response: T;
  resource?: { type: string; id: string };
};

type IdempotencyScope = {
  workspaceId: string;
  actorUserId: string;
  action: string;
  idempotencyKey: string;
  request: unknown;
  ttlMs?: number;
};

type TransactionDatabase = Pick<typeof db, "transaction">;

/** Returns a completed, unexpired replay without reserving a new key. */
export async function getIdempotentReplay<T>(
  scope: IdempotencyScope,
): Promise<T | undefined> {
  if (!IDEMPOTENCY_KEY_PATTERN.test(scope.idempotencyKey)) {
    throw new InvalidIdempotencyKeyError();
  }
  const [existing] = await db
    .select({
      requestHash: idempotencyRecords.requestHash,
      responseData: idempotencyRecords.responseData,
    })
    .from(idempotencyRecords)
    .where(
      and(
        eq(idempotencyRecords.workspaceId, scope.workspaceId),
        eq(idempotencyRecords.actorUserId, scope.actorUserId),
        eq(idempotencyRecords.action, scope.action),
        eq(idempotencyRecords.idempotencyKey, scope.idempotencyKey),
        eq(idempotencyRecords.status, "completed"),
        sql`${idempotencyRecords.expiresAt} > CURRENT_TIMESTAMP`,
      ),
    )
    .limit(1);
  if (!existing) return undefined;
  if (existing.requestHash !== fingerprintIdempotentRequest(scope.request)) {
    throw new IdempotencyConflictError();
  }
  return existing.responseData as T;
}

/**
 * Runs a mutation in the same transaction as its idempotency reservation.
 * PostgreSQL's unique index makes a competing INSERT wait for the winner. The
 * loser then replays the committed response. If work throws, the reservation
 * rolls back too, so transient/unknown failures may safely retry the same key.
 * Authorization and input validation must happen before calling this helper.
 */
export async function executeIdempotentMutation<T>(
  scope: IdempotencyScope,
  mutation: (tx: DatabaseClient) => Promise<IdempotentMutationResult<T>>,
  database: TransactionDatabase = db,
): Promise<{ value: T; replayed: boolean }> {
  if (!IDEMPOTENCY_KEY_PATTERN.test(scope.idempotencyKey)) {
    throw new InvalidIdempotencyKeyError();
  }

  const requestHash = fingerprintIdempotentRequest(scope.request);
  const expiresAt = new Date(Date.now() + (scope.ttlMs ?? DEFAULT_TTL_MS));

  return database.transaction(async (tx) => {
    // Expired completed keys have no replay guarantee and become reusable.
    await tx.delete(idempotencyRecords).where(
      and(
        eq(idempotencyRecords.workspaceId, scope.workspaceId),
        eq(idempotencyRecords.actorUserId, scope.actorUserId),
        eq(idempotencyRecords.action, scope.action),
        eq(idempotencyRecords.idempotencyKey, scope.idempotencyKey),
        eq(idempotencyRecords.status, "completed"),
        lte(idempotencyRecords.expiresAt, sql`CURRENT_TIMESTAMP`),
      ),
    );

    const [reserved] = await tx
      .insert(idempotencyRecords)
      .values({
        workspaceId: scope.workspaceId,
        actorUserId: scope.actorUserId,
        action: scope.action,
        idempotencyKey: scope.idempotencyKey,
        requestHash,
        expiresAt,
      })
      .onConflictDoNothing({
        target: [
          idempotencyRecords.workspaceId,
          idempotencyRecords.actorUserId,
          idempotencyRecords.action,
          idempotencyRecords.idempotencyKey,
        ],
      })
      .returning({ id: idempotencyRecords.id });

    if (!reserved) {
      const [existing] = await tx
        .select({
          requestHash: idempotencyRecords.requestHash,
          status: idempotencyRecords.status,
          responseData: idempotencyRecords.responseData,
        })
        .from(idempotencyRecords)
        .where(
          and(
            eq(idempotencyRecords.workspaceId, scope.workspaceId),
            eq(idempotencyRecords.actorUserId, scope.actorUserId),
            eq(idempotencyRecords.action, scope.action),
            eq(idempotencyRecords.idempotencyKey, scope.idempotencyKey),
          ),
        )
        .for("update")
        .limit(1);

      if (!existing || existing.requestHash !== requestHash) {
        throw new IdempotencyConflictError();
      }
      if (existing.status !== "completed") {
        // Normally unreachable because the conflicting INSERT waits for the
        // first transaction. Retaining this guard makes corrupted rows fail safe.
        throw new Error("The original request is still being processed.");
      }
      return { value: existing.responseData as T, replayed: true };
    }

    const result = await mutation(tx);
    await tx
      .update(idempotencyRecords)
      .set({
        status: "completed",
        responseData: canonicalize(result.response),
        resourceType: result.resource?.type,
        resourceId: result.resource?.id,
        completedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(idempotencyRecords.id, reserved.id));

    return { value: result.response, replayed: false };
  });
}

export async function cleanupExpiredIdempotencyRecords(
  client: DatabaseClient = db,
  limit = 1_000,
) {
  const expired = await client
    .select({ id: idempotencyRecords.id })
    .from(idempotencyRecords)
    .where(
      and(
        eq(idempotencyRecords.status, "completed"),
        lte(idempotencyRecords.expiresAt, sql`CURRENT_TIMESTAMP`),
      ),
    )
    .limit(Math.max(1, Math.min(limit, 10_000)));
  if (expired.length === 0) return 0;
  const ids = expired.map(({ id }) => id);
  await client.delete(idempotencyRecords).where(inArray(idempotencyRecords.id, ids));
  return ids.length;
}
