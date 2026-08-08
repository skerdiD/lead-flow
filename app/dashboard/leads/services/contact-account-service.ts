import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, contacts } from "@/db/schema";
import {
  getRecordUpdateConditions,
  type WorkspaceAuthorizationContext,
} from "@/lib/authorization";
import type { LeadDbClient } from "./db-client";

export async function saveLeadAccount(params: {
  client?: LeadDbClient;
  workspaceId: string;
  userId: string;
  ownerUserId: string | null;
  authorizationContext: WorkspaceAuthorizationContext;
  existingAccountId?: string | null;
  company?: string;
}) {
  const client = params.client ?? db;

  if (!params.company) return null;

  if (params.existingAccountId) {
    const [updatedAccount] = await client
      .update(accounts)
      .set({
        name: params.company,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(accounts.id, params.existingAccountId),
          ...getRecordUpdateConditions(
            params.authorizationContext,
            accounts.workspaceId,
            accounts.assignedOwnerUserId,
          ),
        ),
      )
      .returning({ id: accounts.id });

    if (updatedAccount) return updatedAccount.id;

    throw new Error(
      "This account could not be found or you do not have permission to update it.",
    );
  }

  const [createdAccount] = await client
    .insert(accounts)
    .values({
      workspaceId: params.workspaceId,
      userId: params.userId,
      assignedOwnerUserId: params.ownerUserId,
      name: params.company,
    })
    .returning({ id: accounts.id });

  return createdAccount?.id ?? null;
}

export async function saveLeadContact(params: {
  client?: LeadDbClient;
  workspaceId: string;
  userId: string;
  ownerUserId: string | null;
  authorizationContext: WorkspaceAuthorizationContext;
  existingContactId?: string | null;
  accountId?: string | null;
  fullName: string;
  email?: string;
  phone?: string;
}) {
  const client = params.client ?? db;

  if (params.existingContactId) {
    const [updatedContact] = await client
      .update(contacts)
      .set({
        accountId: params.accountId ?? null,
        fullName: params.fullName,
        email: params.email ?? null,
        phone: params.phone ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contacts.id, params.existingContactId),
          ...getRecordUpdateConditions(
            params.authorizationContext,
            contacts.workspaceId,
            contacts.assignedOwnerUserId,
          ),
        ),
      )
      .returning({ id: contacts.id });

    if (updatedContact) return updatedContact.id;

    throw new Error(
      "This contact could not be found or you do not have permission to update it.",
    );
  }

  const [createdContact] = await client
    .insert(contacts)
    .values({
      workspaceId: params.workspaceId,
      userId: params.userId,
      assignedOwnerUserId: params.ownerUserId,
      accountId: params.accountId ?? null,
      fullName: params.fullName,
      email: params.email ?? null,
      phone: params.phone ?? null,
    })
    .returning({ id: contacts.id });

  return createdContact?.id ?? null;
}
