"use server";

import { and, eq, gte, lt } from "drizzle-orm";
import { revalidatePathBestEffort as revalidatePath } from "@/lib/revalidation.server";
import { db } from "@/db";
import { accounts, contacts, deals, leads, workspaceMembers } from "@/db/schema";
import {
  canAccessRecord,
  getRecordVisibilityConditions,
  getRecordUpdateConditions,
  getWorkspaceAuthorizationContext,
  hasWorkspacePermission,
} from "@/lib/authorization";
import { requireUserId } from "@/lib/auth";
import { createCrmActivity } from "@/lib/crm-activity.server";
import { DEMO_MUTATION_MESSAGE, isDemoWorkspace } from "@/lib/demo";
import { reportUnexpectedError } from "@/lib/error-reporting.server";
import { moneyToCents } from "@/lib/revenue";
import { isUuid } from "@/lib/uuid";
import { accountFormSchema, type AccountFormValues } from "@/lib/validations/account";
import { contactFormSchema, type ContactFormValues } from "@/lib/validations/contact";
import { dealFormSchema, dealMoveSchema, type DealFormValues } from "@/lib/validations/deal";
import { getCurrentWorkspace } from "@/lib/workspaces";
import { writeAuditEvent } from "@/lib/audit-log.server";
import { getRequestId } from "@/lib/request-context.server";

type MutationResult = { success: true; id: string; message: string } | { success: false; message: string; fieldErrors?: Record<string, string[]> };
type MoveResult = { success: true; stage: string; updatedAt: string; message: string } | { success: false; message: string };

function mutationPaths(...paths: string[]) {
  for (const path of ["/dashboard", "/dashboard/activity", ...paths]) revalidatePath(path);
}

async function validateMember(workspaceId: string, userId: string | undefined) {
  if (!userId) return null;
  const [member] = await db.select({ userId: workspaceMembers.userId }).from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId))).limit(1);
  return member ? userId : null;
}

type CrmMutationPermission = "crm:create" | "crm:update" | "crm:delete";

async function prepareMutation(permission: CrmMutationPermission) {
  const [workspace, userId] = await Promise.all([getCurrentWorkspace(), requireUserId()]);
  if (isDemoWorkspace(workspace)) return { error: DEMO_MUTATION_MESSAGE } as const;
  const allowed = permission === "crm:update"
    ? hasWorkspacePermission(workspace.role, "crm:update_all") || hasWorkspacePermission(workspace.role, "crm:update_assigned")
    : hasWorkspacePermission(workspace.role, permission);
  if (!allowed) return { error: "You do not have permission to make this change." } as const;
  return { workspace, userId, context: getWorkspaceAuthorizationContext(workspace, userId) } as const;
}

export async function createAccountAction(values: AccountFormValues): Promise<MutationResult> {
  const parsed = accountFormSchema.safeParse(values);
  if (!parsed.success) return { success: false, message: "Please review the account details.", fieldErrors: parsed.error.flatten().fieldErrors };
  const state = await prepareMutation("crm:create"); if ("error" in state) return { success: false, message: state.error ?? "You do not have permission to make this change." };
  const owner = hasWorkspacePermission(state.workspace.role, "crm:assign")
    ? await validateMember(state.workspace.id, parsed.data.assignedOwnerUserId)
    : state.userId;
  if (parsed.data.assignedOwnerUserId && !owner) return { success: false, message: "Choose a valid workspace member as the owner." };
  const requestId = await getRequestId();
  let record: { id: string };
  try {
    record = await db.transaction(async (tx) => {
      const [created] = await tx.insert(accounts).values({ workspaceId: state.workspace.id, userId: state.userId, assignedOwnerUserId: owner, name: parsed.data.name, website: parsed.data.website, industry: parsed.data.industry }).returning({ id: accounts.id });
      await createCrmActivity({ client: tx, workspaceId: state.workspace.id, userId: state.userId, eventType: "account_created", message: `Account created: ${parsed.data.name}`, accountId: created.id });
      await writeAuditEvent({ tx, workspaceId: state.workspace.id, actor: { userId: state.userId, role: state.workspace.role }, action: "account.created", entity: { type: "account", id: created.id }, after: { name: parsed.data.name, website: parsed.data.website, industry: parsed.data.industry, assignedOwnerUserId: owner }, requestId });
      return created;
    });
  } catch (error) {
    await reportUnexpectedError(error, { event: "account.create.failed", requestId, workspaceId: state.workspace.id, userId: state.userId, entityType: "account", operation: "account.create", errorCategory: "transaction_failure" });
    return { success: false, message: "We couldn't create this account right now. Please try again." };
  }
  mutationPaths("/dashboard/accounts", `/dashboard/accounts/${record.id}`); return { success: true, id: record.id, message: "Account created." };
}

export async function updateAccountAction(id: string, values: AccountFormValues): Promise<MutationResult> {
  if (!isUuid(id)) return { success: false, message: "This account could not be found." };
  const parsed = accountFormSchema.safeParse(values); if (!parsed.success) return { success: false, message: "Please review the account details.", fieldErrors: parsed.error.flatten().fieldErrors };
  const state = await prepareMutation("crm:update"); if ("error" in state) return { success: false, message: state.error ?? "You do not have permission to make this change." };
  const [existing] = await db.select({ workspaceId: accounts.workspaceId, assignedUserId: accounts.assignedOwnerUserId, name: accounts.name, website: accounts.website, industry: accounts.industry }).from(accounts).where(and(eq(accounts.id, id), eq(accounts.workspaceId, state.workspace.id))).limit(1);
  if (!existing || !canAccessRecord(state.context, existing, "update")) return { success: false, message: "This account could not be found or you do not have permission to update it." };
  const owner = hasWorkspacePermission(state.workspace.role, "crm:assign") ? await validateMember(state.workspace.id, parsed.data.assignedOwnerUserId) : existing.assignedUserId;
  if (parsed.data.assignedOwnerUserId && !owner) return { success: false, message: "Choose a valid workspace member as the owner." };
  const requestId = await getRequestId();
  let record: { id: string } | undefined;
  try {
    record = await db.transaction(async (tx) => {
      const [updated] = await tx.update(accounts).set({ name: parsed.data.name, website: parsed.data.website, industry: parsed.data.industry, assignedOwnerUserId: owner, updatedAt: new Date() }).where(and(eq(accounts.id, id), ...getRecordUpdateConditions(state.context, accounts.workspaceId, accounts.assignedOwnerUserId))).returning({ id: accounts.id });
      if (!updated) return undefined;
      await createCrmActivity({ client: tx, workspaceId: state.workspace.id, userId: state.userId, eventType: "account_updated", message: `Account updated: ${parsed.data.name}`, accountId: id });
      await writeAuditEvent({ tx, workspaceId: state.workspace.id, actor: { userId: state.userId, role: state.workspace.role }, action: "account.updated", entity: { type: "account", id }, before: { name: existing.name, website: existing.website, industry: existing.industry, assignedOwnerUserId: existing.assignedUserId }, after: { name: parsed.data.name, website: parsed.data.website, industry: parsed.data.industry, assignedOwnerUserId: owner }, requestId });
      return updated;
    });
  } catch (error) {
    await reportUnexpectedError(error, { event: "account.update.failed", requestId, workspaceId: state.workspace.id, userId: state.userId, entityType: "account", entityId: id, operation: "account.update", errorCategory: "transaction_failure" });
    return { success: false, message: "We couldn't update this account right now. Please try again." };
  }
  if (!record) return { success: false, message: "This account could not be found or you do not have permission to update it." };
  mutationPaths("/dashboard/accounts", `/dashboard/accounts/${id}`); return { success: true, id, message: "Account updated." };
}

export async function archiveAccountAction(id: string): Promise<MutationResult> {
  if (!isUuid(id)) return { success: false, message: "This account could not be found." }; const state = await prepareMutation("crm:delete"); if ("error" in state) return { success: false, message: state.error ?? "You do not have permission to make this change." };
  const requestId = await getRequestId();
  const record = await db.transaction(async (tx) => {
    const [archived] = await tx.update(accounts).set({ isArchived: true, archivedAt: new Date(), updatedAt: new Date() }).where(and(eq(accounts.id, id), eq(accounts.workspaceId, state.workspace.id), eq(accounts.isArchived, false))).returning({ id: accounts.id, name: accounts.name });
    if (!archived) return null;
    await createCrmActivity({ client: tx, workspaceId: state.workspace.id, userId: state.userId, eventType: "account_archived", message: `Account archived: ${archived.name}`, accountId: id });
    await writeAuditEvent({ tx, workspaceId: state.workspace.id, actor: { userId: state.userId, role: state.workspace.role }, action: "account.archived", entity: { type: "account", id }, before: { name: archived.name, isArchived: false }, after: { isArchived: true }, requestId });
    return archived;
  });
  if (!record) return { success: false, message: "This account could not be found." }; mutationPaths("/dashboard/accounts", `/dashboard/accounts/${id}`); return { success: true, id, message: "Account archived. Linked CRM history was preserved." };
}

export async function createContactAction(values: ContactFormValues): Promise<MutationResult> {
  const parsed = contactFormSchema.safeParse(values); if (!parsed.success) return { success: false, message: "Please review the contact details.", fieldErrors: parsed.error.flatten().fieldErrors };
  const state = await prepareMutation("crm:create"); if ("error" in state) return { success: false, message: state.error ?? "You do not have permission to make this change." };
  const accountId = parsed.data.accountId && isUuid(parsed.data.accountId) ? parsed.data.accountId : null;
  if (parsed.data.accountId && (!accountId || !(await db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.workspaceId, state.workspace.id), eq(accounts.isArchived, false))).limit(1))[0])) return { success: false, message: "Choose an active account in this workspace." };
  const owner = hasWorkspacePermission(state.workspace.role, "crm:assign") ? await validateMember(state.workspace.id, parsed.data.assignedOwnerUserId) : state.userId;
  if (parsed.data.assignedOwnerUserId && !owner) return { success: false, message: "Choose a valid workspace member as the owner." };
  const requestId = await getRequestId();
  let record: { id: string } | null;
  try {
    record = await db.transaction(async (tx) => {
      if (accountId) {
        const [activeAccount] = await tx.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.workspaceId, state.workspace.id), eq(accounts.isArchived, false))).for("share").limit(1);
        if (!activeAccount) return null;
      }
      if (parsed.data.isPrimary && accountId) await tx.update(contacts).set({ isPrimary: false }).where(and(eq(contacts.workspaceId, state.workspace.id), eq(contacts.accountId, accountId)));
      const [created] = await tx.insert(contacts).values({ workspaceId: state.workspace.id, userId: state.userId, assignedOwnerUserId: owner, accountId, fullName: parsed.data.fullName, email: parsed.data.email?.toLowerCase(), phone: parsed.data.phone, title: parsed.data.title, isPrimary: parsed.data.isPrimary && Boolean(accountId) }).returning({ id: contacts.id });
      await createCrmActivity({ client: tx, workspaceId: state.workspace.id, userId: state.userId, eventType: "contact_created", message: `Contact created: ${parsed.data.fullName}`, contactId: created.id, accountId });
      await writeAuditEvent({ tx, workspaceId: state.workspace.id, actor: { userId: state.userId, role: state.workspace.role }, action: "contact.created", entity: { type: "contact", id: created.id }, after: { fullName: parsed.data.fullName, email: parsed.data.email?.toLowerCase(), phone: parsed.data.phone, title: parsed.data.title, accountId, assignedOwnerUserId: owner, isPrimary: parsed.data.isPrimary && Boolean(accountId) }, requestId });
      return created;
    });
  } catch (error) {
    await reportUnexpectedError(error, { event: "contact.create.failed", requestId, workspaceId: state.workspace.id, userId: state.userId, entityType: "contact", operation: "contact.create", errorCategory: "transaction_failure" });
    return { success: false, message: "We couldn't create this contact right now. Please try again." };
  }
  if (!record) return { success: false, message: "Choose an active account in this workspace." };
  mutationPaths("/dashboard/contacts", `/dashboard/contacts/${record.id}`, ...(accountId ? [`/dashboard/accounts/${accountId}`] : [])); return { success: true, id: record.id, message: "Contact created." };
}

export async function updateContactAction(id: string, values: ContactFormValues): Promise<MutationResult> {
  if (!isUuid(id)) return { success: false, message: "This contact could not be found." }; const parsed = contactFormSchema.safeParse(values); if (!parsed.success) return { success: false, message: "Please review the contact details.", fieldErrors: parsed.error.flatten().fieldErrors };
  const state = await prepareMutation("crm:update"); if ("error" in state) return { success: false, message: state.error ?? "You do not have permission to make this change." };
  const [existing] = await db.select({ workspaceId: contacts.workspaceId, assignedUserId: contacts.assignedOwnerUserId, accountId: contacts.accountId, fullName: contacts.fullName, email: contacts.email, phone: contacts.phone, title: contacts.title, isPrimary: contacts.isPrimary }).from(contacts).where(and(eq(contacts.id, id), eq(contacts.workspaceId, state.workspace.id))).limit(1); if (!existing || !canAccessRecord(state.context, existing, "update")) return { success: false, message: "This contact could not be found or you do not have permission to update it." };
  const accountId = parsed.data.accountId && isUuid(parsed.data.accountId) ? parsed.data.accountId : null; if (parsed.data.accountId && (!accountId || !(await db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.workspaceId, state.workspace.id), eq(accounts.isArchived, false))).limit(1))[0])) return { success: false, message: "Choose an active account in this workspace." };
  const owner = hasWorkspacePermission(state.workspace.role, "crm:assign") ? await validateMember(state.workspace.id, parsed.data.assignedOwnerUserId) : existing.assignedUserId; if (parsed.data.assignedOwnerUserId && !owner) return { success: false, message: "Choose a valid workspace member as the owner." };
  const requestId = await getRequestId();
  let record: { id: string } | null | undefined;
  try {
    record = await db.transaction(async (tx) => {
      const [lockedContact] = await tx.select({ id: contacts.id }).from(contacts).where(and(eq(contacts.id, id), ...getRecordUpdateConditions(state.context, contacts.workspaceId, contacts.assignedOwnerUserId))).for("update").limit(1);
      if (!lockedContact) return undefined;
      if (accountId) {
        const [activeAccount] = await tx.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.workspaceId, state.workspace.id), eq(accounts.isArchived, false))).for("share").limit(1);
        if (!activeAccount) return null;
      }
      if (parsed.data.isPrimary && accountId) await tx.update(contacts).set({ isPrimary: false }).where(and(eq(contacts.workspaceId, state.workspace.id), eq(contacts.accountId, accountId)));
      const [updated] = await tx.update(contacts).set({ fullName: parsed.data.fullName, email: parsed.data.email?.toLowerCase(), phone: parsed.data.phone, title: parsed.data.title, accountId, assignedOwnerUserId: owner, isPrimary: parsed.data.isPrimary && Boolean(accountId), updatedAt: new Date() }).where(and(eq(contacts.id, id), ...getRecordUpdateConditions(state.context, contacts.workspaceId, contacts.assignedOwnerUserId))).returning({ id: contacts.id });
      if (!updated) return undefined;
      await createCrmActivity({ client: tx, workspaceId: state.workspace.id, userId: state.userId, eventType: "contact_updated", message: `Contact updated: ${parsed.data.fullName}`, contactId: id, accountId });
      await writeAuditEvent({ tx, workspaceId: state.workspace.id, actor: { userId: state.userId, role: state.workspace.role }, action: "contact.updated", entity: { type: "contact", id }, before: { fullName: existing.fullName, email: existing.email, phone: existing.phone, title: existing.title, accountId: existing.accountId, assignedOwnerUserId: existing.assignedUserId, isPrimary: existing.isPrimary }, after: { fullName: parsed.data.fullName, email: parsed.data.email?.toLowerCase(), phone: parsed.data.phone, title: parsed.data.title, accountId, assignedOwnerUserId: owner, isPrimary: parsed.data.isPrimary && Boolean(accountId) }, requestId });
      return updated;
    });
  } catch (error) {
    await reportUnexpectedError(error, { event: "contact.update.failed", requestId, workspaceId: state.workspace.id, userId: state.userId, entityType: "contact", entityId: id, operation: "contact.update", errorCategory: "transaction_failure" });
    return { success: false, message: "We couldn't update this contact right now. Please try again." };
  }
  if (record === null) return { success: false, message: "Choose an active account in this workspace." };
  if (!record) return { success: false, message: "This contact could not be found or you do not have permission to update it." };
  mutationPaths("/dashboard/contacts", `/dashboard/contacts/${id}`, ...(existing.accountId ? [`/dashboard/accounts/${existing.accountId}`] : []), ...(accountId ? [`/dashboard/accounts/${accountId}`] : [])); return { success: true, id, message: "Contact updated." };
}

export async function archiveContactAction(id: string): Promise<MutationResult> {
  if (!isUuid(id)) return { success: false, message: "This contact could not be found." }; const state = await prepareMutation("crm:delete"); if ("error" in state) return { success: false, message: state.error ?? "You do not have permission to make this change." };
  const requestId = await getRequestId();
  const record = await db.transaction(async (tx) => {
    const [archived] = await tx.update(contacts).set({ isArchived: true, archivedAt: new Date(), isPrimary: false, updatedAt: new Date() }).where(and(eq(contacts.id, id), eq(contacts.workspaceId, state.workspace.id), eq(contacts.isArchived, false))).returning({ id: contacts.id, fullName: contacts.fullName, accountId: contacts.accountId, isPrimary: contacts.isPrimary }); if (!archived) return null;
    await createCrmActivity({ client: tx, workspaceId: state.workspace.id, userId: state.userId, eventType: "contact_archived", message: `Contact archived: ${archived.fullName}`, contactId: id, accountId: archived.accountId });
    await writeAuditEvent({ tx, workspaceId: state.workspace.id, actor: { userId: state.userId, role: state.workspace.role }, action: "contact.archived", entity: { type: "contact", id }, before: { fullName: archived.fullName, isPrimary: archived.isPrimary }, after: { isArchived: true, isPrimary: false }, requestId });
    return archived;
  });
  if (!record) return { success: false, message: "This contact could not be found." }; mutationPaths("/dashboard/contacts", `/dashboard/contacts/${id}`, ...(record.accountId ? [`/dashboard/accounts/${record.accountId}`] : [])); return { success: true, id, message: "Contact archived. Linked CRM history was preserved." };
}

async function validateDealLinks(
  context: ReturnType<typeof getWorkspaceAuthorizationContext>,
  values: DealFormValues,
) {
  const ids = [values.leadId, values.accountId, values.contactId];
  if (ids.some((id) => id && !isUuid(id))) return false;

  // Selector visibility is a convenience only. Reapply it here so crafted
  // server-action payloads cannot attach a new deal to another member's CRM record.
  const [leadRows, accountRows, contactRows] = await Promise.all([
    values.leadId
      ? db.select({ id: leads.id }).from(leads).where(and(
        eq(leads.id, values.leadId),
        eq(leads.isArchived, false),
        ...getRecordVisibilityConditions(context, leads.workspaceId, leads.assignedOwnerUserId),
      )).limit(1)
      : Promise.resolve([{ id: "" }]),
    values.accountId
      ? db.select({ id: accounts.id }).from(accounts).where(and(
        eq(accounts.id, values.accountId),
        eq(accounts.isArchived, false),
        ...getRecordVisibilityConditions(context, accounts.workspaceId, accounts.assignedOwnerUserId),
      )).limit(1)
      : Promise.resolve([{ id: "" }]),
    values.contactId
      ? db.select({ id: contacts.id }).from(contacts).where(and(
        eq(contacts.id, values.contactId),
        eq(contacts.isArchived, false),
        ...getRecordVisibilityConditions(context, contacts.workspaceId, contacts.assignedOwnerUserId),
      )).limit(1)
      : Promise.resolve([{ id: "" }]),
  ]);

  return Boolean(leadRows[0] && accountRows[0] && contactRows[0]);
}

export async function createDealAction(values: DealFormValues): Promise<MutationResult> {
  const parsed = dealFormSchema.safeParse(values); if (!parsed.success) return { success: false, message: "Please review the deal details.", fieldErrors: parsed.error.flatten().fieldErrors }; const state = await prepareMutation("crm:create"); if ("error" in state) return { success: false, message: state.error ?? "You do not have permission to make this change." };
  if (!(await validateDealLinks(state.context, parsed.data))) return { success: false, message: "Choose related records from this active workspace." }; const owner = hasWorkspacePermission(state.workspace.role, "crm:assign") && parsed.data.ownerUserId ? await validateMember(state.workspace.id, parsed.data.ownerUserId) : state.userId; if (parsed.data.ownerUserId && !owner) return { success: false, message: "Choose a valid workspace member as the owner." }; if (parsed.data.stage === "lost" && !parsed.data.lostReason) return { success: false, message: "A lost reason is required before closing a deal as lost." };
  let record: { id: string } | null;
  try {
    record = await db.transaction(async (tx) => { const [created] = await tx.insert(deals).values({ workspaceId: state.workspace.id, userId: state.userId, ownerUserId: owner, leadId: parsed.data.leadId || null, accountId: parsed.data.accountId || null, contactId: parsed.data.contactId || null, name: parsed.data.name, stage: parsed.data.stage, valueCents: moneyToCents(parsed.data.value), currency: parsed.data.currency, probability: parsed.data.probability, expectedCloseAt: parsed.data.expectedCloseDate ? new Date(`${parsed.data.expectedCloseDate}T00:00:00Z`) : null, closedAt: ["won", "lost"].includes(parsed.data.stage) ? new Date() : null, lostReason: parsed.data.stage === "lost" ? parsed.data.lostReason : null }).onConflictDoNothing({ target: [deals.workspaceId, deals.leadId] }).returning({ id: deals.id }); if (!created) return null; await createCrmActivity({ client: tx, workspaceId: state.workspace.id, userId: state.userId, eventType: "deal_updated", message: `Deal created: ${parsed.data.name}`, dealId: created.id, leadId: parsed.data.leadId || null, accountId: parsed.data.accountId || null, contactId: parsed.data.contactId || null }); return created; });
  } catch {
    return { success: false, message: "We couldn't create this deal right now. Please try again." };
  }
  if (!record) return { success: false, message: "This lead already has a deal." };
  mutationPaths("/dashboard/deals", `/dashboard/deals/${record.id}`); return { success: true, id: record.id, message: "Deal created." };
}

export async function moveDealAction(input: { dealId: string; stage: string; updatedAt: string; lostReason?: string }): Promise<MoveResult> {
  const parsed = dealMoveSchema.safeParse(input); if (!parsed.success) return { success: false, message: "This deal transition is not valid." }; const state = await prepareMutation("crm:update"); if ("error" in state) return { success: false, message: state.error ?? "You do not have permission to make this change." };
  const [existing] = await db.select({ id: deals.id, workspaceId: deals.workspaceId, assignedUserId: deals.ownerUserId, name: deals.name, stage: deals.stage, updatedAt: deals.updatedAt, closedAt: deals.closedAt, leadId: deals.leadId }).from(deals).where(and(eq(deals.id, parsed.data.dealId), eq(deals.workspaceId, state.workspace.id))).limit(1); if (!existing || !canAccessRecord(state.context, existing, "update")) return { success: false, message: "This deal could not be found or you do not have permission to update it." }; if (existing.updatedAt.toISOString() !== parsed.data.updatedAt) return { success: false, message: "This deal changed elsewhere. Refresh and try again." }; if (parsed.data.stage === "lost" && !parsed.data.lostReason) return { success: false, message: "A lost reason is required before closing a deal as lost." };
  const expectedUpdatedAt = new Date(parsed.data.updatedAt);
  const expectedUpdatedAtEnd = new Date(expectedUpdatedAt.getTime() + 1);
  const reopening = ["won", "lost"].includes(existing.stage) && !["won", "lost"].includes(parsed.data.stage);
  let updated: { updatedAt: Date } | null;
  try {
    updated = await db.transaction(async (tx) => { const [record] = await tx.update(deals).set({ stage: parsed.data.stage, closedAt: reopening ? null : ["won", "lost"].includes(parsed.data.stage) ? existing.closedAt ?? new Date() : null, lostReason: parsed.data.stage === "lost" ? parsed.data.lostReason : null, updatedAt: new Date() }).where(and(eq(deals.id, existing.id), eq(deals.workspaceId, state.workspace.id), gte(deals.updatedAt, expectedUpdatedAt), lt(deals.updatedAt, expectedUpdatedAtEnd), ...getRecordUpdateConditions(state.context, deals.workspaceId, deals.ownerUserId))).returning({ updatedAt: deals.updatedAt }); if (!record) return null; await createCrmActivity({ client: tx, workspaceId: state.workspace.id, userId: state.userId, eventType: parsed.data.stage === "lost" ? "deal_lost" : "deal_stage_changed", message: `Deal moved to ${parsed.data.stage}: ${existing.name}`, dealId: existing.id, leadId: existing.leadId }); return record; });
  } catch {
    return { success: false, message: "We couldn't update this deal right now. Please try again." };
  }
  if (!updated) return { success: false, message: "This deal changed elsewhere. Refresh and try again." };
  mutationPaths("/dashboard/deals", `/dashboard/deals/${existing.id}`); return { success: true, stage: parsed.data.stage, updatedAt: updated.updatedAt.toISOString(), message: reopening ? "Deal reopened; the closed date was cleared." : "Deal stage updated." };
}

/** Permanently removes only the deal. Database FKs retain every related CRM record. */
export async function deleteDealAction(id: string): Promise<MutationResult> {
  if (!isUuid(id)) return { success: false, message: "This deal could not be found." };
  const state = await prepareMutation("crm:delete");
  if ("error" in state) return { success: false, message: state.error ?? "You do not have permission to make this change." };
  const [existing] = await db.select({ id: deals.id, workspaceId: deals.workspaceId, assignedUserId: deals.ownerUserId, name: deals.name, accountId: deals.accountId, contactId: deals.contactId, leadId: deals.leadId }).from(deals).where(and(eq(deals.id, id), eq(deals.workspaceId, state.workspace.id))).limit(1);
  if (!existing || !canAccessRecord(state.context, existing, "delete")) return { success: false, message: "This deal could not be found or you do not have permission to delete it." };
  const requestId = await getRequestId();
  const deleted = await db.transaction(async (tx) => {
    const [record] = await tx.delete(deals).where(and(eq(deals.id, id), eq(deals.workspaceId, state.workspace.id))).returning({ id: deals.id });
    if (!record) return null;
    await createCrmActivity({ client: tx, workspaceId: state.workspace.id, userId: state.userId, eventType: "deal_updated", message: `Deal deleted: ${existing.name}`, leadId: existing.leadId, accountId: existing.accountId, contactId: existing.contactId });
    await writeAuditEvent({ tx, workspaceId: state.workspace.id, actor: { userId: state.userId, role: state.workspace.role }, action: "deal.deleted", entity: { type: "deal", id }, before: { name: existing.name, accountId: existing.accountId, contactId: existing.contactId, leadId: existing.leadId }, requestId });
    return record;
  });
  if (!deleted) return { success: false, message: "This deal was already deleted." };
  mutationPaths("/dashboard/deals", `/dashboard/deals/${id}`);
  return { success: true, id, message: "Deal deleted. Related CRM records were preserved." };
}
