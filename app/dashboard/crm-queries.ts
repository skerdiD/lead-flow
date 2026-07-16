import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, activityEvents, contacts, crmTasks, deals, leads } from "@/db/schema";
import { getCurrentWorkspaceAuthorizationContext, getRecordVisibilityConditions, getTaskVisibilityConditions, hasWorkspacePermission } from "@/lib/authorization";
import { isUuid } from "@/lib/uuid";

type ListParams = { search?: string; owner?: string; account?: string; archived?: string; page?: string; sort?: string; direction?: string };
const pageSize = 20;
const page = (value?: string) => Math.max(1, Number.parseInt(value ?? "1", 10) || 1);
const search = (value?: string) => value?.trim().slice(0, 120) ?? "";

export type AccountListItem = { id: string; name: string; website: string | null; industry: string | null; assignedOwnerUserId: string | null; contactCount: number; leadCount: number; dealCount: number; pipelineValueCents: number; updatedAt: Date };
export async function getAccountsList(params: ListParams = {}) {
  const context = await getCurrentWorkspaceAuthorizationContext(); const query = search(params.search); const active = params.archived === "archived";
  const conditions = [...getRecordVisibilityConditions(context, accounts.workspaceId, accounts.assignedOwnerUserId), eq(accounts.isArchived, active)];
  if (query) conditions.push(or(ilike(accounts.name, `%${query}%`), ilike(accounts.industry, `%${query}%`))!); if (params.owner) conditions.push(eq(accounts.assignedOwnerUserId, params.owner));
  const contactCount = sql<number>`(select count(*) from ${contacts} where ${contacts.workspaceId} = ${accounts.workspaceId} and ${contacts.accountId} = ${accounts.id} and ${contacts.isArchived} = false)`;
  const leadCount = sql<number>`(select count(*) from ${leads} where ${leads.workspaceId} = ${accounts.workspaceId} and ${leads.accountId} = ${accounts.id} and ${leads.isArchived} = false)`;
  const dealCount = sql<number>`(select count(*) from ${deals} where ${deals.workspaceId} = ${accounts.workspaceId} and ${deals.accountId} = ${accounts.id})`;
  const pipelineValueCents = sql<number>`coalesce((select sum(${deals.valueCents}) from ${deals} where ${deals.workspaceId} = ${accounts.workspaceId} and ${deals.accountId} = ${accounts.id} and ${deals.stage} not in ('won', 'lost')), 0)`;
  const total = await db.select({ count: sql<number>`count(*)` }).from(accounts).where(and(...conditions)); const order = params.sort === "name" ? (params.direction === "asc" ? asc(accounts.name) : desc(accounts.name)) : desc(accounts.updatedAt);
  const records = await db.select({ id: accounts.id, name: accounts.name, website: accounts.website, industry: accounts.industry, assignedOwnerUserId: accounts.assignedOwnerUserId, contactCount, leadCount, dealCount, pipelineValueCents, updatedAt: accounts.updatedAt }).from(accounts).where(and(...conditions)).orderBy(order, asc(accounts.name)).limit(pageSize).offset((page(params.page) - 1) * pageSize);
  return { records, totalCount: Number(total[0]?.count ?? 0), page: page(params.page), pageSize, search: query, archived: active };
}

export type ContactListItem = { id: string; fullName: string; email: string | null; phone: string | null; title: string | null; accountId: string | null; accountName: string | null; isPrimary: boolean; assignedOwnerUserId: string | null; dealCount: number; leadCount: number; updatedAt: Date };
export async function getContactsList(params: ListParams = {}) {
  const context = await getCurrentWorkspaceAuthorizationContext(); const query = search(params.search); const active = params.archived === "archived";
  const conditions = [...getRecordVisibilityConditions(context, contacts.workspaceId, contacts.assignedOwnerUserId), eq(contacts.isArchived, active)]; if (query) conditions.push(or(ilike(contacts.fullName, `%${query}%`), ilike(contacts.email, `%${query}%`), ilike(contacts.phone, `%${query}%`), ilike(contacts.title, `%${query}%`), ilike(accounts.name, `%${query}%`))!); if (params.owner) conditions.push(eq(contacts.assignedOwnerUserId, params.owner)); if (params.account && isUuid(params.account)) conditions.push(eq(contacts.accountId, params.account));
  const accountJoin = and(eq(contacts.accountId, accounts.id), eq(contacts.workspaceId, accounts.workspaceId), ...getRecordVisibilityConditions(context, accounts.workspaceId, accounts.assignedOwnerUserId));
  const dealCount = sql<number>`(select count(*) from ${deals} where ${deals.workspaceId} = ${contacts.workspaceId} and ${deals.contactId} = ${contacts.id})`; const leadCount = sql<number>`(select count(*) from ${leads} where ${leads.workspaceId} = ${contacts.workspaceId} and ${leads.primaryContactId} = ${contacts.id} and ${leads.isArchived} = false)`;
  const total = await db.select({ count: sql<number>`count(*)` }).from(contacts).leftJoin(accounts, accountJoin).where(and(...conditions)); const order = params.sort === "name" ? (params.direction === "asc" ? asc(contacts.fullName) : desc(contacts.fullName)) : desc(contacts.updatedAt);
  const records = await db.select({ id: contacts.id, fullName: contacts.fullName, email: contacts.email, phone: contacts.phone, title: contacts.title, accountId: contacts.accountId, accountName: accounts.name, isPrimary: contacts.isPrimary, assignedOwnerUserId: contacts.assignedOwnerUserId, dealCount, leadCount, updatedAt: contacts.updatedAt }).from(contacts).leftJoin(accounts, accountJoin).where(and(...conditions)).orderBy(order, asc(contacts.fullName)).limit(pageSize).offset((page(params.page) - 1) * pageSize);
  return { records, totalCount: Number(total[0]?.count ?? 0), page: page(params.page), pageSize, search: query, archived: active };
}

export async function getAccountDetails(id: string) {
  if (!isUuid(id)) return null; const context = await getCurrentWorkspaceAuthorizationContext(); const [account] = await db.select().from(accounts).where(and(eq(accounts.id, id), ...getRecordVisibilityConditions(context, accounts.workspaceId, accounts.assignedOwnerUserId))).limit(1); if (!account) return null;
  const [relatedContacts, relatedLeads, relatedDeals, openTasks, events] = await Promise.all([
    db.select({ id: contacts.id, fullName: contacts.fullName, email: contacts.email, title: contacts.title, isPrimary: contacts.isPrimary }).from(contacts).where(and(eq(contacts.accountId, id), eq(contacts.isArchived, false), ...getRecordVisibilityConditions(context, contacts.workspaceId, contacts.assignedOwnerUserId))).orderBy(asc(contacts.fullName)),
    db.select({ id: leads.id, fullName: leads.fullName, status: leads.status, assignedOwnerUserId: leads.assignedOwnerUserId }).from(leads).where(and(eq(leads.accountId, id), eq(leads.isArchived, false), ...getRecordVisibilityConditions(context, leads.workspaceId, leads.assignedOwnerUserId))).orderBy(desc(leads.updatedAt)),
    db.select({ id: deals.id, name: deals.name, stage: deals.stage, valueCents: deals.valueCents, currency: deals.currency, expectedCloseAt: deals.expectedCloseAt }).from(deals).where(and(eq(deals.accountId, id), ...getRecordVisibilityConditions(context, deals.workspaceId, deals.ownerUserId))).orderBy(desc(deals.updatedAt)),
    db.select({ id: crmTasks.id, title: crmTasks.title, dueAt: crmTasks.dueAt, priority: crmTasks.priority }).from(crmTasks).innerJoin(deals, and(eq(crmTasks.dealId, deals.id), eq(crmTasks.workspaceId, deals.workspaceId))).where(and(eq(deals.accountId, id), eq(crmTasks.status, "pending"), ...getTaskVisibilityConditions(context, crmTasks.workspaceId, crmTasks.ownerUserId, crmTasks.userId), ...getRecordVisibilityConditions(context, deals.workspaceId, deals.ownerUserId))).orderBy(asc(crmTasks.dueAt)),
    db.select({ id: activityEvents.id, eventType: activityEvents.eventType, message: activityEvents.message, createdAt: activityEvents.createdAt }).from(activityEvents).where(and(eq(activityEvents.accountId, id), eq(activityEvents.workspaceId, context.workspaceId))).orderBy(desc(activityEvents.createdAt)).limit(12),
  ]);
  return { account, relatedContacts, relatedLeads, relatedDeals, openTasks, events };
}

export async function getContactDetails(id: string) {
  if (!isUuid(id)) return null; const context = await getCurrentWorkspaceAuthorizationContext(); const [contact] = await db.select({ id: contacts.id, fullName: contacts.fullName, email: contacts.email, phone: contacts.phone, title: contacts.title, accountId: contacts.accountId, accountName: accounts.name, isPrimary: contacts.isPrimary, assignedOwnerUserId: contacts.assignedOwnerUserId, isArchived: contacts.isArchived, createdAt: contacts.createdAt, updatedAt: contacts.updatedAt }).from(contacts).leftJoin(accounts, and(eq(contacts.accountId, accounts.id), eq(contacts.workspaceId, accounts.workspaceId), ...getRecordVisibilityConditions(context, accounts.workspaceId, accounts.assignedOwnerUserId))).where(and(eq(contacts.id, id), ...getRecordVisibilityConditions(context, contacts.workspaceId, contacts.assignedOwnerUserId))).limit(1); if (!contact) return null;
  const [relatedLeads, relatedDeals, openTasks, events] = await Promise.all([
    db.select({ id: leads.id, fullName: leads.fullName, status: leads.status }).from(leads).where(and(eq(leads.primaryContactId, id), eq(leads.isArchived, false), ...getRecordVisibilityConditions(context, leads.workspaceId, leads.assignedOwnerUserId))).orderBy(desc(leads.updatedAt)),
    db.select({ id: deals.id, name: deals.name, stage: deals.stage, valueCents: deals.valueCents, currency: deals.currency }).from(deals).where(and(eq(deals.contactId, id), ...getRecordVisibilityConditions(context, deals.workspaceId, deals.ownerUserId))).orderBy(desc(deals.updatedAt)),
    db.select({ id: crmTasks.id, title: crmTasks.title, dueAt: crmTasks.dueAt, priority: crmTasks.priority }).from(crmTasks).where(and(eq(crmTasks.contactId, id), eq(crmTasks.status, "pending"), ...getTaskVisibilityConditions(context, crmTasks.workspaceId, crmTasks.ownerUserId, crmTasks.userId))).orderBy(asc(crmTasks.dueAt)),
    db.select({ id: activityEvents.id, eventType: activityEvents.eventType, message: activityEvents.message, createdAt: activityEvents.createdAt }).from(activityEvents).where(and(eq(activityEvents.contactId, id), eq(activityEvents.workspaceId, context.workspaceId))).orderBy(desc(activityEvents.createdAt)).limit(12),
  ]); return { contact, relatedLeads, relatedDeals, openTasks, events };
}

export async function getCrmSelectors() {
  const context = await getCurrentWorkspaceAuthorizationContext(); const visible = hasWorkspacePermission(context.role, "crm:view_all");
  const [accountRows, contactRows, leadRows] = await Promise.all([
    db.select({ id: accounts.id, label: accounts.name }).from(accounts).where(and(eq(accounts.workspaceId, context.workspaceId), eq(accounts.isArchived, false), ...(visible ? [] : getRecordVisibilityConditions(context, accounts.workspaceId, accounts.assignedOwnerUserId)))).orderBy(asc(accounts.name)).limit(200),
    db.select({ id: contacts.id, label: contacts.fullName }).from(contacts).where(and(eq(contacts.workspaceId, context.workspaceId), eq(contacts.isArchived, false), ...(visible ? [] : getRecordVisibilityConditions(context, contacts.workspaceId, contacts.assignedOwnerUserId)))).orderBy(asc(contacts.fullName)).limit(200),
    db.select({ id: leads.id, label: leads.fullName }).from(leads).where(and(eq(leads.workspaceId, context.workspaceId), eq(leads.isArchived, false), ...getRecordVisibilityConditions(context, leads.workspaceId, leads.assignedOwnerUserId))).orderBy(asc(leads.fullName)).limit(200),
  ]); return { accounts: accountRows, contacts: contactRows, leads: leadRows };
}
