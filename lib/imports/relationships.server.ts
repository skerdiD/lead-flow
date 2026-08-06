import "server-only";

import { and, eq } from "drizzle-orm";
import { accounts, contacts, workspaceMembers } from "@/db/schema";
import type { DatabaseClient } from "@/lib/db-client";

type ImportRelationshipClient = Pick<DatabaseClient, "select">;

export type ImportRelationshipIds = {
  assignedOwnerUserId: string | null;
  accountId: string | null;
  primaryContactId: string | null;
};

/**
 * Revalidates persisted import relationships at write time. The workspace ID
 * must come from an already-authorized, server-loaded import job, never from a
 * request body or query parameter.
 */
export async function assertImportRowRelationships(
  client: ImportRelationshipClient,
  workspaceId: string,
  relationships: ImportRelationshipIds,
) {
  const [ownerMembership, relatedAccount, primaryContact] = await Promise.all([
    relationships.assignedOwnerUserId
      ? client
          .select({ userId: workspaceMembers.userId })
          .from(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.workspaceId, workspaceId),
              eq(
                workspaceMembers.userId,
                relationships.assignedOwnerUserId,
              ),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    relationships.accountId
      ? client
          .select({ id: accounts.id })
          .from(accounts)
          .where(
            and(
              eq(accounts.id, relationships.accountId),
              eq(accounts.workspaceId, workspaceId),
              eq(accounts.isArchived, false),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    relationships.primaryContactId
      ? client
          .select({ id: contacts.id })
          .from(contacts)
          .where(
            and(
              eq(contacts.id, relationships.primaryContactId),
              eq(contacts.workspaceId, workspaceId),
              eq(contacts.isArchived, false),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);

  if (
    (relationships.assignedOwnerUserId && !ownerMembership[0]) ||
    (relationships.accountId && !relatedAccount[0]) ||
    (relationships.primaryContactId && !primaryContact[0])
  ) {
    throw new Error("An import relationship is no longer available.");
  }
}
