import type { db } from "@/db";

/**
 * Query surface shared by the normal Drizzle client and transaction clients.
 * Mutation helpers should accept this type instead of importing the global
 * client when they may be called from inside a transaction.
 */
export type DatabaseClient = Pick<
  typeof db,
  "delete" | "insert" | "select" | "update"
>;

export type InsertDatabaseClient = Pick<DatabaseClient, "insert">;
