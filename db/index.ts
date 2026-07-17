import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import { observeDatabaseOperation } from "@/lib/database-observability.server";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Drizzle delegates normal queries to the pool and transactional queries to a
// pool client. Instrument both without logging SQL text or query parameters.
function observeQuery<T extends object>(client: T & { query: unknown }) {
  const originalQuery = client.query as (...args: unknown[]) => unknown;
  client.query = ((...args: unknown[]) =>
    observeDatabaseOperation("postgres.query", () =>
      Promise.resolve(Reflect.apply(originalQuery, client, args)),
    )) as unknown;
}

observeQuery(pool);
const observedClients = new WeakSet<object>();
pool.on("connect", (client) => {
  if (observedClients.has(client)) return;
  observedClients.add(client);
  observeQuery(client);
});

export const db = drizzle(pool, { schema });
