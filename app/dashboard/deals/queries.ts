import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import { accounts, contacts, deals, leads } from "@/db/schema";
import {
  getCurrentWorkspaceAuthorizationContext,
  getRecordVisibilityConditions,
  hasWorkspacePermission,
  type WorkspaceAuthorizationContext,
} from "@/lib/authorization";
import { DEAL_STAGES, type DealStage } from "@/lib/constants/crm";
import { isUuid } from "@/lib/uuid";
import {
  getWorkspaceMemberOptions,
  resolveWorkspaceMemberProfiles,
  type WorkspaceMemberOption,
  type WorkspaceMemberProfile,
} from "@/lib/workspace-member-profiles.server";

const DEAL_LIST_PAGE_SIZES = [10, 25, 50] as const;
const PIPELINE_CARD_LIMIT = 300;

export type DealPipelineFilters = {
  search?: string;
  owner?: string;
  account?: string;
  stage?: string;
  state?: string;
  closeFrom?: string;
  closeTo?: string;
  view?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
};

export type PipelineDeal = {
  id: string;
  name: string;
  stage: DealStage;
  valueCents: number;
  currency: string;
  probability: number;
  expectedCloseAt: string | null;
  closedAt: string | null;
  lostReason: string | null;
  owner: WorkspaceMemberProfile | null;
  accountId: string | null;
  accountName: string | null;
  contactId: string | null;
  contactName: string | null;
  leadId: string | null;
  leadName: string | null;
  updatedAt: string;
};

export type DealStageTotal = {
  count: number;
  values: Array<{ currency: string; valueCents: number }>;
};

export type NormalizedDealFilters = {
  search: string;
  owner: string;
  account: string;
  stage: DealStage | "";
  state: "open" | "closed" | "";
  closeFrom: string;
  closeTo: string;
  view: "pipeline" | "list";
  sort: "closeAsc" | "valueDesc" | "updatedDesc";
  requestedPage: number;
  pageSize: (typeof DEAL_LIST_PAGE_SIZES)[number];
};

function normalizeDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "" : value;
}

function normalizePositiveInteger(value?: string) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeFilters(filters: DealPipelineFilters): NormalizedDealFilters {
  const pageSize = Number.parseInt(filters.pageSize ?? "", 10);

  return {
    search: filters.search?.trim().slice(0, 120) ?? "",
    owner: filters.owner?.trim().slice(0, 255) ?? "",
    account:
      filters.account && isUuid(filters.account) ? filters.account : "",
    stage: DEAL_STAGES.includes(filters.stage as DealStage)
      ? (filters.stage as DealStage)
      : "",
    state:
      filters.state === "open" || filters.state === "closed"
        ? filters.state
        : "",
    closeFrom: normalizeDate(filters.closeFrom),
    closeTo: normalizeDate(filters.closeTo),
    view: filters.view === "list" ? "list" : "pipeline",
    sort:
      filters.sort === "valueDesc" || filters.sort === "updatedDesc"
        ? filters.sort
        : "closeAsc",
    requestedPage: normalizePositiveInteger(filters.page),
    pageSize: DEAL_LIST_PAGE_SIZES.includes(
      pageSize as (typeof DEAL_LIST_PAGE_SIZES)[number],
    )
      ? (pageSize as (typeof DEAL_LIST_PAGE_SIZES)[number])
      : 25,
  };
}

function getRelationshipJoins(context: WorkspaceAuthorizationContext) {
  return {
    account: and(
      eq(deals.accountId, accounts.id),
      eq(deals.workspaceId, accounts.workspaceId),
      ...getRecordVisibilityConditions(
        context,
        accounts.workspaceId,
        accounts.assignedOwnerUserId,
      ),
    ),
    contact: and(
      eq(deals.contactId, contacts.id),
      eq(deals.workspaceId, contacts.workspaceId),
      ...getRecordVisibilityConditions(
        context,
        contacts.workspaceId,
        contacts.assignedOwnerUserId,
      ),
    ),
    lead: and(
      eq(deals.leadId, leads.id),
      eq(deals.workspaceId, leads.workspaceId),
      ...getRecordVisibilityConditions(
        context,
        leads.workspaceId,
        leads.assignedOwnerUserId,
      ),
    ),
  };
}

function buildDealConditions(
  context: WorkspaceAuthorizationContext,
  filters: NormalizedDealFilters,
) {
  const conditions = [
    ...getRecordVisibilityConditions(
      context,
      deals.workspaceId,
      deals.ownerUserId,
    ),
  ];

  if (filters.search) {
    conditions.push(
      or(
        ilike(deals.name, `%${filters.search}%`),
        ilike(accounts.name, `%${filters.search}%`),
        ilike(contacts.fullName, `%${filters.search}%`),
        ilike(leads.fullName, `%${filters.search}%`),
      )!,
    );
  }
  if (filters.owner) conditions.push(eq(deals.ownerUserId, filters.owner));
  if (filters.account) conditions.push(eq(deals.accountId, filters.account));
  if (filters.stage) conditions.push(eq(deals.stage, filters.stage));
  if (filters.state === "open") {
    conditions.push(
      or(
        eq(deals.stage, "new"),
        eq(deals.stage, "contacted"),
        eq(deals.stage, "qualified"),
        eq(deals.stage, "proposal"),
      )!,
    );
  }
  if (filters.state === "closed") {
    conditions.push(or(eq(deals.stage, "won"), eq(deals.stage, "lost"))!);
  }
  if (filters.closeFrom) {
    conditions.push(
      gte(deals.expectedCloseAt, new Date(`${filters.closeFrom}T00:00:00Z`)),
    );
  }
  if (filters.closeTo) {
    conditions.push(
      lte(deals.expectedCloseAt, new Date(`${filters.closeTo}T23:59:59Z`)),
    );
  }

  return conditions;
}

function getSortOrder(sort: NormalizedDealFilters["sort"]): SQL[] {
  if (sort === "valueDesc") {
    return [desc(deals.valueCents), desc(deals.updatedAt)];
  }
  if (sort === "updatedDesc") return [desc(deals.updatedAt)];
  return [asc(deals.expectedCloseAt), desc(deals.updatedAt)];
}

function createEmptyTotals() {
  return DEAL_STAGES.reduce(
    (totals, stage) => {
      totals[stage] = { count: 0, values: [] };
      return totals;
    },
    {} as Record<DealStage, DealStageTotal>,
  );
}

export async function getDealsPipeline(filters: DealPipelineFilters = {}) {
  const referenceTime = new Date().getTime();
  const context = await getCurrentWorkspaceAuthorizationContext();
  const normalized = normalizeFilters(filters);
  const accountConditions = getRecordVisibilityConditions(
    context,
    accounts.workspaceId,
    accounts.assignedOwnerUserId,
  );
  accountConditions.push(eq(accounts.isArchived, false));

  const [ownerOptions, accountOptions, existingCountRow] = await Promise.all([
    getWorkspaceMemberOptions(
      hasWorkspacePermission(context.role, "crm:view_all")
        ? undefined
        : [context.userId],
    ),
    db
      .select({ id: accounts.id, name: accounts.name })
      .from(accounts)
      .where(and(...accountConditions))
      .orderBy(asc(accounts.name))
      .limit(200),
    db.select({ count: sql<number>`count(*)` }).from(deals).where(and(...getRecordVisibilityConditions(context, deals.workspaceId, deals.ownerUserId))),
  ]);

  const allowedOwnerIds = new Set(ownerOptions.map((member) => member.userId));
  const allowedAccountIds = new Set(accountOptions.map((account) => account.id));
  normalized.owner = allowedOwnerIds.has(normalized.owner)
    ? normalized.owner
    : "";
  normalized.account = allowedAccountIds.has(normalized.account)
    ? normalized.account
    : "";

  const conditions = buildDealConditions(context, normalized);
  const joins = getRelationshipJoins(context);
  const aggregateRows = await db
    .select({
      stage: deals.stage,
      currency: deals.currency,
      count: sql<number>`count(*)`,
      valueCents: sql<number>`coalesce(sum(${deals.valueCents}), 0)`,
    })
    .from(deals)
    .leftJoin(accounts, joins.account)
    .leftJoin(contacts, joins.contact)
    .leftJoin(leads, joins.lead)
    .where(and(...conditions))
    .groupBy(deals.stage, deals.currency);

  const totals = createEmptyTotals();
  for (const row of aggregateRows) {
    totals[row.stage].count += Number(row.count ?? 0);
    totals[row.stage].values.push({
      currency: row.currency,
      valueCents: Number(row.valueCents ?? 0),
    });
  }

  const totalCount = DEAL_STAGES.reduce(
    (sum, stage) => sum + totals[stage].count,
    0,
  );
  const pageCount = Math.max(1, Math.ceil(totalCount / normalized.pageSize));
  const page = Math.min(normalized.requestedPage, pageCount);
  const limit =
    normalized.view === "list" ? normalized.pageSize : PIPELINE_CARD_LIMIT;
  const offset = normalized.view === "list" ? (page - 1) * limit : 0;

  const rows = await db
    .select({
      id: deals.id,
      name: deals.name,
      stage: deals.stage,
      valueCents: deals.valueCents,
      currency: deals.currency,
      probability: deals.probability,
      expectedCloseAt: deals.expectedCloseAt,
      closedAt: deals.closedAt,
      lostReason: deals.lostReason,
      ownerUserId: deals.ownerUserId,
      accountId: deals.accountId,
      accountName: accounts.name,
      contactId: deals.contactId,
      contactName: contacts.fullName,
      leadId: deals.leadId,
      leadName: leads.fullName,
      updatedAt: deals.updatedAt,
    })
    .from(deals)
    .leftJoin(accounts, joins.account)
    .leftJoin(contacts, joins.contact)
    .leftJoin(leads, joins.lead)
    .where(and(...conditions))
    .orderBy(...getSortOrder(normalized.sort))
    .limit(limit)
    .offset(offset);

  const profilesById = new Map<string, WorkspaceMemberProfile>(
    ownerOptions.map(({ userId, ...profile }) => [userId, profile]),
  );
  const safeRows: PipelineDeal[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    stage: row.stage,
    valueCents: row.valueCents,
    currency: row.currency,
    probability: row.probability,
    expectedCloseAt: row.expectedCloseAt?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    lostReason: row.lostReason,
    owner: row.ownerUserId
      ? (profilesById.get(row.ownerUserId) ?? {
          name: "Unknown member",
          imageUrl: null,
        })
      : null,
    accountId: row.accountId,
    accountName: row.accountName,
    contactId: row.contactId,
    contactName: row.contactName,
    leadId: row.leadId,
    leadName: row.leadName,
    updatedAt: row.updatedAt.toISOString(),
  }));

  const grouped = Object.fromEntries(
    DEAL_STAGES.map((stage) => [stage, [] as PipelineDeal[]]),
  ) as Record<DealStage, PipelineDeal[]>;
  for (const row of safeRows) grouped[row.stage].push(row);

  return {
    grouped,
    deals: safeRows,
    totals,
    totalCount,
    page,
    pageCount,
    pageSize: normalized.pageSize,
    ownerOptions: ownerOptions satisfies WorkspaceMemberOption[],
    accountOptions,
    filters: normalized,
    referenceTime,
    isTruncated:
      normalized.view === "pipeline" && totalCount > PIPELINE_CARD_LIMIT,
    hasAnyDeals: Number(existingCountRow[0]?.count ?? 0) > 0,
  };
}

export async function getDealDetails(id: string) {
  if (!isUuid(id)) return null;
  const context = await getCurrentWorkspaceAuthorizationContext();
  const joins = getRelationshipJoins(context);
  const [deal] = await db
    .select({
      id: deals.id,
      name: deals.name,
      stage: deals.stage,
      valueCents: deals.valueCents,
      currency: deals.currency,
      probability: deals.probability,
      expectedCloseAt: deals.expectedCloseAt,
      closedAt: deals.closedAt,
      lostReason: deals.lostReason,
      ownerUserId: deals.ownerUserId,
      accountId: deals.accountId,
      accountName: accounts.name,
      contactId: deals.contactId,
      contactName: contacts.fullName,
      leadId: deals.leadId,
      leadName: leads.fullName,
      updatedAt: deals.updatedAt,
    })
    .from(deals)
    .leftJoin(accounts, joins.account)
    .leftJoin(contacts, joins.contact)
    .leftJoin(leads, joins.lead)
    .where(
      and(
        eq(deals.id, id),
        ...getRecordVisibilityConditions(
          context,
          deals.workspaceId,
          deals.ownerUserId,
        ),
      ),
    )
    .limit(1);

  if (!deal) return null;
  const profiles = deal.ownerUserId
    ? await resolveWorkspaceMemberProfiles([deal.ownerUserId])
    : new Map<string, WorkspaceMemberProfile>();
  const { ownerUserId, ...safeDeal } = deal;

  return {
    ...safeDeal,
    owner: ownerUserId
      ? (profiles.get(ownerUserId) ?? {
          name: "Unknown member",
          imageUrl: null,
        })
      : null,
  };
}
