import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
const [{ db }, { idempotencyRecords }] = await Promise.all([
  import("../db"),
  import("../db/schema"),
]);

const requestedLimit = Number(process.argv[2] ?? "1000");
const limit = Math.max(
  1,
  Math.min(Number.isSafeInteger(requestedLimit) ? requestedLimit : 1_000, 10_000),
);
const expired = await db
  .select({ id: idempotencyRecords.id })
  .from(idempotencyRecords)
  .where(
    and(
      eq(idempotencyRecords.status, "completed"),
      lte(idempotencyRecords.expiresAt, sql`CURRENT_TIMESTAMP`),
    ),
  )
  .limit(limit);
if (expired.length > 0) {
  await db
    .delete(idempotencyRecords)
    .where(inArray(idempotencyRecords.id, expired.map(({ id }) => id)));
}
const deleted = expired.length;

console.log(`Deleted ${deleted} expired idempotency record(s).`);
process.exit(0);
