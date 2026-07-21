"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts, activityEvents, contacts, deals, leads, workspaceMembers } from "@/db/schema";
import {
  canAccessRecord,
  getRecordUpdateConditions,
  getWorkspaceAuthorizationContext,
  hasWorkspacePermission,
} from "@/lib/authorization";
import { requireUserId } from "@/lib/auth";
import { DEMO_MUTATION_MESSAGE, isDemoWorkspace } from "@/lib/demo";
import { moneyToCents } from "@/lib/revenue";
import { isUuid } from "@/lib/uuid";
import { accountFormSchema, type AccountFormValues } from "@/lib/validations/account";
import { contactFormSchema, type ContactFormValues } from "@/lib/validations/contact";
import { dealFormSchema, dealMoveSchema, type DealFormValues } from "@/lib/validations/deal";
import { getCurrentWorkspace } from "@/lib/workspaces";

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

async function activity(input: { client?: Pick<typeof db, "insert">; workspaceId: string; userId: string; eventType: typeof activityEvents.$inferInsert.eventType; message: string; accountId?: string | null; contactId?: string | null; dealId?: string | null; leadId?: string | null; leadName?: string | null }) {
  const { client = db, ...event } = input;
  await client.insert(activityEvents).values(event);
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
  const [record] = await db.insert(accounts).values({ workspaceId: state.workspace.id, userId: state.userId, assignedOwnerUserId: owner, name: parsed.data.name, website: parsed.data.website, industry: parsed.data.industry }).returning({ id: accounts.id });
  await activity({ workspaceId: state.workspace.id, userId: state.userId, eventType: "account_created", message: `Account created: ${parsed.data.name}`, accountId: record.id });
  mutationPaths("/dashboard/accounts", `/dashboard/accounts/${record.id}`); return { success: true, id: record.id, message: "Account created." };
}

export async function updateAccountAction(id: string, values: AccountFormValues): Promise<MutationResult> {
  if (!isUuid(id)) return { success: false, message: "This account could not be found." };
  const parsed = accountFormSchema.safeParse(values); if (!parsed.success) return { success: false, message: "Please review the account details.", fieldErrors: parsed.error.flatten().fieldErrors };
  const state = await prepareMutation("crm:update"); if ("error" in state) return { success: false, message: state.error ?? "You do not have permission to make this change." };
  const [existing] = await db.select({ workspaceId: accounts.workspaceId, assignedUserId: accounts.assignedOwnerUserId }).from(accounts).where(and(eq(accounts.id, id), eq(accounts.workspaceId, state.workspace.id))).limit(1);
  if (!existing || !canAccessRecord(state.context, existing, "update")) return { success: false, message: "This account could not be found or you do not have permission to update it." };
  const owner = hasWorkspacePermission(state.workspace.role, "crm:assign") ? await validateMember(state.workspace.id, parsed.data.assignedOwnerUserId) : existing.assignedUserId;
  if (parsed.data.assignedOwnerUserId && !owner) return { success: false, message: "Choose a valid workspace member as the owner." };
  const [record] = await db.update(accounts).set({ name: parsed.data.name, website: parsed.data.website, industry: parsed.data.industry, assignedOwnerUserId: owner, updatedAt: new Date() }).where(and(eq(accounts.id, id), ...getRecordUpdateConditions(state.context, accounts.workspaceId, accounts.assignedOwnerUserId))).returning({ id: accounts.id });
  if (!record) return { success: false, message: "This account could not be found or you do not have permission to update it." };
  await activity({ workspaceId: state.workspace.id, userId: state.userId, eventType: "account_updated", message: `Account updated: ${parsed.data.name}`, accountId: id }); mutationPaths("/dashboard/accounts", `/dashboard/accounts/${id}`); return { success: true, id, message: "Account updated." };
}

export async function archiveAccountAction(id: string): Promise<MutationResult> {
  if (!isUuid(id)) return { success: false, message: "This account could not be found." }; const state = await prepareMutation("crm:delete"); if ("error" in state) return { success: false, message: state.error ?? "You do not have permission to make this change." };
  const [record] = await db.update(accounts).set({ isArchived: true, archivedAt: new Date(), updatedAt: new Date() }).where(and(eq(accounts.id, id), eq(accounts.workspaceId, state.workspace.id), eq(accounts.isArchived, false))).returning({ id: accounts.id, name: accounts.name });
  if (!record) return { success: false, message: "This account could not be found." }; await activity({ workspaceId: state.workspace.id, userId: state.userId, eventType: "account_archived", message: `Account archived: ${record.name}`, accountId: id }); mutationPaths("/dashboard/accounts", `/dashboard/accounts/${id}`); return { success: true, id, message: "Account archived. Linked CRM history was preserved." };
}

export async function createContactAction(values: ContactFormValues): Promise<MutationResult> {
  const parsed = contactFormSchema.safeParse(values); if (!parsed.success) return { success: false, message: "Please review the contact details.", fieldErrors: parsed.error.flatten().fieldErrors };
  const state = await prepareMutation("crm:create"); if ("error" in state) return { success: false, message: state.error ?? "You do not have permission to make this change." };
  const accountId = parsed.data.accountId && isUuid(parsed.data.accountId) ? parsed.data.accountId : null;
  if (parsed.data.accountId && (!accountId || !(await db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.workspaceId, state.workspace.id), eq(accounts.isArchived, false))).limit(1))[0])) return { success: false, message: "Choose an active account in this workspace." };
  const owner = hasWorkspacePermission(state.workspace.role, "crm:assign") ? await validateMember(state.workspace.id, parsed.data.assignedOwnerUserId) : state.userId;
  if (parsed.data.assignedOwnerUserId && !owner) return { success: false, message: "Choose a valid workspace member as the owner." };
  const record = await db.transaction(async (tx) => { if (parsed.data.isPrimary && accountId) await tx.update(contacts).set({ isPrimary: false }).where(and(eq(contacts.workspaceId, state.workspace.id), eq(contacts.accountId, accountId))); const [created] = await tx.insert(contacts).values({ workspaceId: state.workspace.id, userId: state.userId, assignedOwnerUserId: owner, accountId, fullName: parsed.data.fullName, email: parsed.data.email?.toLowerCase(), phone: parsed.data.phone, title: parsed.data.title, isPrimary: parsed.data.isPrimary && Boolean(accountId) }).returning({ id: contacts.id }); return created; });
  await activity({ workspaceId: state.workspace.id, userId: state.userId, eventType: "contact_created", message: `Contact created: ${parsed.data.fullName}`, contactId: record.id, accountId }); mutationPaths("/dashboard/contacts", `/dashboard/contacts/${record.id}`, ...(accountId ? [`/dashboard/accounts/${accountId}`] : [])); return { success: true, id: record.id, message: "Contact created." };
}

export async function updateContactAction(id: string, values: ContactFormValues): Promise<MutationResult> {
  if (!isUuid(id)) return { success: false, message: "This contact could not be found." }; const parsed = contactFormSchema.safeParse(values); if (!parsed.success) return { success: false, message: "Please review the contact details.", fieldErrors: parsed.error.flatten().fieldErrors };
  const state = await prepareMutation("crm:update"); if ("error" in state) return { success: false, message: state.error ?? "You do not have permission to make this change." };
  const [existing] = await db.select({ workspaceId: contacts.workspaceId, assignedUserId: contacts.assignedOwnerUserId, accountId: contacts.accountId }).from(contacts).where(and(eq(contacts.id, id), eq(contacts.workspaceId, state.workspace.id))).limit(1); if (!existing || !canAccessRecord(state.context, existing, "update")) return { success: false, message: "This contact could not be found or you do not have permission to update it." };
  const accountId = parsed.data.accountId && isUuid(parsed.data.accountId) ? parsed.data.accountId : null; if (parsed.data.accountId && (!accountId || !(await db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.workspaceId, state.workspace.id), eq(accounts.isArchived, false))).limit(1))[0])) return { success: false, message: "Choose an active account in this workspace." };
  const owner = hasWorkspacePermission(state.workspace.role, "crm:assign") ? await validateMember(state.workspace.id, parsed.data.assignedOwnerUserId) : existing.assignedUserId; if (parsed.data.assignedOwnerUserId && !owner) return { success: false, message: "Choose a valid workspace member as the owner." };
  const record = await db.transaction(async (tx) => { if (parsed.data.isPrimary && accountId) await tx.update(contacts).set({ isPrimary: false }).where(and(eq(contacts.workspaceId, state.workspace.id), eq(contacts.accountId, accountId))); const [updated] = await tx.update(contacts).set({ fullName: parsed.data.fullName, email: parsed.data.email?.toLowerCase(), phone: parsed.data.phone, title: parsed.data.title, accountId, assignedOwnerUserId: owner, isPrimary: parsed.data.isPrimary && Boolean(accountId), updatedAt: new Date() }).where(and(eq(contacts.id, id), ...getRecordUpdateConditions(state.context, contacts.workspaceId, contacts.assignedOwnerUserId))).returning({ id: contacts.id }); return updated; });
  if (!record) return { success: false, message: "This contact could not be found or you do not have permission to update it." }; await activity({ workspaceId: state.workspace.id, userId: state.userId, eventType: "contact_updated", message: `Contact updated: ${parsed.data.fullName}`, contactId: id, accountId }); mutationPaths("/dashboard/contacts", `/dashboard/contacts/${id}`, ...(existing.accountId ? [`/dashboard/accounts/${existing.accountId}`] : []), ...(accountId ? [`/dashboard/accounts/${accountId}`] : [])); return { success: true, id, message: "Contact updated." };
}

export async function archiveContactAction(id: string): Promise<MutationResult> {
  if (!isUuid(id)) return { success: false, message: "This contact could not be found." }; const state = await prepareMutation("crm:delete"); if ("error" in state) return { success: false, message: state.error ?? "You do not have permission to make this change." };
  const [record] = await db.update(contacts).set({ isArchived: true, archivedAt: new Date(), isPrimary: false, updatedAt: new Date() }).where(and(eq(contacts.id, id), eq(contacts.workspaceId, state.workspace.id), eq(contacts.isArchived, false))).returning({ id: contacts.id, fullName: contacts.fullName, accountId: contacts.accountId }); if (!record) return { success: false, message: "This contact could not be found." };
  await activity({ workspaceId: state.workspace.id, userId: state.userId, eventType: "contact_archived", message: `Contact archived: ${record.fullName}`, contactId: id, accountId: record.accountId }); mutationPaths("/dashboard/contacts", `/dashboard/contacts/${id}`, ...(record.accountId ? [`/dashboard/accounts/${record.accountId}`] : [])); return { success: true, id, message: "Contact archived. Linked CRM history was preserved." };
}

async function validateDealLinks(workspaceId: string, values: DealFormValues) {
  const links = [[values.leadId, leads, leads.isArchived], [values.accountId, accounts, accounts.isArchived], [values.contactId, contacts, contacts.isArchived]] as const;
  for (const [id, table, archived] of links) { if (id && (!isUuid(id) || !(await db.select({ id: table.id }).from(table).where(and(eq(table.id, id), eq(table.workspaceId, workspaceId), eq(archived, false))).limit(1))[0])) return false; }
  return true;
}

export async function createDealAction(values: DealFormValues): Promise<MutationResult> {
  const parsed = dealFormSchema.safeParse(values); if (!parsed.success) return { success: false, message: "Please review the deal details.", fieldErrors: parsed.error.flatten().fieldErrors }; const state = await prepareMutation("crm:create"); if ("error" in state) return { success: false, message: state.error ?? "You do not have permission to make this change." };
  if (!(await validateDealLinks(state.workspace.id, parsed.data))) return { success: false, message: "Choose related records from this active workspace." }; const owner = hasWorkspacePermission(state.workspace.role, "crm:assign") ? await validateMember(state.workspace.id, parsed.data.ownerUserId) : state.userId; if (parsed.data.ownerUserId && !owner) return { success: false, message: "Choose a valid workspace member as the owner." }; if (parsed.data.stage === "lost" && !parsed.data.lostReason) return { success: false, message: "A lost reason is required before closing a deal as lost." };
  const record = await db.transaction(async (tx) => { const [created] = await tx.insert(deals).values({ workspaceId: state.workspace.id, userId: state.userId, ownerUserId: owner, leadId: parsed.data.leadId || null, accountId: parsed.data.accountId || null, contactId: parsed.data.contactId || null, name: parsed.data.name, stage: parsed.data.stage, valueCents: moneyToCents(parsed.data.value), currency: parsed.data.currency, probability: parsed.data.probability, expectedCloseAt: parsed.data.expectedCloseDate ? new Date(`${parsed.data.expectedCloseDate}T00:00:00Z`) : null, closedAt: ["won", "lost"].includes(parsed.data.stage) ? new Date() : null, lostReason: parsed.data.stage === "lost" ? parsed.data.lostReason : null }).onConflictDoNothing({ target: [deals.workspaceId, deals.leadId] }).returning({ id: deals.id }); if (!created) return null; await activity({ client: tx, workspaceId: state.workspace.id, userId: state.userId, eventType: "deal_updated", message: `Deal created: ${parsed.data.name}`, dealId: created.id, leadId: parsed.data.leadId || null, accountId: parsed.data.accountId || null, contactId: parsed.data.contactId || null }); return created; });
  if (!record) return { success: false, message: "This lead already has a deal." };
  mutationPaths("/dashboard/deals", `/dashboard/deals/${record.id}`); return { success: true, id: record.id, message: "Deal created." };
}

export async function moveDealAction(input: { dealId: string; stage: string; updatedAt: string; lostReason?: string }): Promise<MoveResult> {
  const parsed = dealMoveSchema.safeParse(input); if (!parsed.success) return { success: false, message: "This deal transition is not valid." }; const state = await prepareMutation("crm:update"); if ("error" in state) return { success: false, message: state.error ?? "You do not have permission to make this change." };
  const [existing] = await db.select({ id: deals.id, workspaceId: deals.workspaceId, assignedUserId: deals.ownerUserId, name: deals.name, stage: deals.stage, updatedAt: deals.updatedAt, closedAt: deals.closedAt, leadId: deals.leadId }).from(deals).where(and(eq(deals.id, parsed.data.dealId), eq(deals.workspaceId, state.workspace.id))).limit(1); if (!existing || !canAccessRecord(state.context, existing, "update")) return { success: false, message: "This deal could not be found or you do not have permission to update it." }; if (existing.updatedAt.toISOString() !== parsed.data.updatedAt) return { success: false, message: "This deal changed elsewhere. Refresh and try again." }; if (parsed.data.stage === "lost" && !parsed.data.lostReason) return { success: false, message: "A lost reason is required before closing a deal as lost." };
  const reopening = ["won", "lost"].includes(existing.stage) && !["won", "lost"].includes(parsed.data.stage); const updated = await db.transaction(async (tx) => { const [record] = await tx.update(deals).set({ stage: parsed.data.stage, closedAt: reopening ? null : ["won", "lost"].includes(parsed.data.stage) ? existing.closedAt ?? new Date() : null, lostReason: parsed.data.stage === "lost" ? parsed.data.lostReason : null, updatedAt: new Date() }).where(and(eq(deals.id, existing.id), eq(deals.workspaceId, state.workspace.id), eq(deals.updatedAt, existing.updatedAt), ...getRecordUpdateConditions(state.context, deals.workspaceId, deals.ownerUserId))).returning({ updatedAt: deals.updatedAt }); if (!record) return null; await activity({ client: tx, workspaceId: state.workspace.id, userId: state.userId, eventType: parsed.data.stage === "lost" ? "deal_lost" : "deal_stage_changed", message: `Deal moved to ${parsed.data.stage}: ${existing.name}`, dealId: existing.id, leadId: existing.leadId }); return record; }); if (!updated) return { success: false, message: "This deal changed elsewhere. Refresh and try again." };
  mutationPaths("/dashboard/deals", `/dashboard/deals/${existing.id}`); return { success: true, stage: parsed.data.stage, updatedAt: updated.updatedAt.toISOString(), message: reopening ? "Deal reopened; the closed date was cleared." : "Deal stage updated." };
}
