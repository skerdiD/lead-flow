import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, contacts } from "@/db/schema";
import type { LeadDbClient } from "./db-client";

export async function saveLeadAccount(params: {
  client?: LeadDbClient;
  workspaceId: string;
  userId: string;
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
          eq(accounts.workspaceId, params.workspaceId),
        ),
      )
      .returning({ id: accounts.id });

    if (updatedAccount) return updatedAccount.id;
  }

  const [createdAccount] = await client
    .insert(accounts)
    .values({
      workspaceId: params.workspaceId,
      userId: params.userId,
      name: params.company,
    })
    .returning({ id: accounts.id });

  return createdAccount?.id ?? null;
}

export async function saveLeadContact(params: {
  client?: LeadDbClient;
  workspaceId: string;
  userId: string;
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
          eq(contacts.workspaceId, params.workspaceId),
        ),
      )
      .returning({ id: contacts.id });

    if (updatedContact) return updatedContact.id;
  }

  const [createdContact] = await client
    .insert(contacts)
    .values({
      workspaceId: params.workspaceId,
      userId: params.userId,
      accountId: params.accountId ?? null,
      fullName: params.fullName,
      email: params.email ?? null,
      phone: params.phone ?? null,
    })
    .returning({ id: contacts.id });

  return createdContact?.id ?? null;
}
