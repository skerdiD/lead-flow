import "server-only";

import { db } from "@/db";
import { activityEvents } from "@/db/schema";
import type { InsertDatabaseClient } from "@/lib/db-client";

export async function createCrmActivity(input: {
  client?: InsertDatabaseClient;
  workspaceId: string;
  userId: string;
  eventType: typeof activityEvents.$inferInsert.eventType;
  message: string;
  accountId?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
  leadName?: string | null;
}) {
  const { client = db, ...event } = input;
  await client.insert(activityEvents).values(event);
}
