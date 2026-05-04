import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import {
  DEFAULT_LEADS_TABLE_PAGE_SIZE,
  DEFAULT_LEADS_TABLE_SORT_DIRECTION,
  DEFAULT_LEADS_TABLE_SORT_FIELD,
  LEADS_TABLE_PAGE_SIZES,
  LEADS_TABLE_SORT_FIELDS,
  type LeadsTableSortDirection,
  type LeadsTableSortField,
} from "@/lib/constants/leads-table";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/constants/leads";

export type LeadsListFilters = {
  search?: string;
  status?: string;
  source?: string;
  sortBy?: string;
  sortDir?: string;
  page?: string;
  pageSize?: string;
};

export type NormalizedLeadsFilters = {
  search: string;
  status: string;
  source: string;
  sortBy: LeadsTableSortField;
  sortDir: LeadsTableSortDirection;
  requestedPage: number;
  pageSize: number;
};

export type LeadsListItem = {
  id: string;
  fullName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  source: string | null;
  sourceLabel: string;
  createdAt: string;
};

export type LeadsListResult = {
  leads: LeadsListItem[];
  totalCount: number;
  page: number;
  pageCount: number;
  pageSize: number;
  search: string;
  status: string;
  source: string;
  sortBy: LeadsTableSortField;
  sortDir: LeadsTableSortDirection;
  sourceOptions: Array<{ label: string; count: number }>;
};

function normalizeSearch(value?: string) {
  return value?.trim().slice(0, 120) ?? "";
}

function normalizeStatus(value?: string) {
  if (!value) return "";
  return LEAD_STATUSES.includes(value as LeadStatus) ? value : "";
}

function normalizeSource(value?: string) {
  return value?.trim().slice(0, 100) ?? "";
}

function normalizeSortBy(value?: string): LeadsTableSortField {
  if (!value) return DEFAULT_LEADS_TABLE_SORT_FIELD;
  return LEADS_TABLE_SORT_FIELDS.includes(value as LeadsTableSortField)
    ? (value as LeadsTableSortField)
    : DEFAULT_LEADS_TABLE_SORT_FIELD;
}

function normalizeSortDirection(value?: string): LeadsTableSortDirection {
  return value === "asc" ? "asc" : DEFAULT_LEADS_TABLE_SORT_DIRECTION;
}

function normalizePositiveInteger(value?: string) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return parsed;
}

function normalizePageSize(value?: string) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LEADS_TABLE_PAGE_SIZE;
  return LEADS_TABLE_PAGE_SIZES.includes(
    parsed as (typeof LEADS_TABLE_PAGE_SIZES)[number],
  )
    ? parsed
    : DEFAULT_LEADS_TABLE_PAGE_SIZE;
}

export function normalizeLeadsFilters(filters: LeadsListFilters): NormalizedLeadsFilters {
  return {
    search: normalizeSearch(filters.search),
    status: normalizeStatus(filters.status),
    source: normalizeSource(filters.source),
    sortBy: normalizeSortBy(filters.sortBy),
    sortDir: normalizeSortDirection(filters.sortDir),
    requestedPage: normalizePositiveInteger(filters.page),
    pageSize: normalizePageSize(filters.pageSize),
  };
}

export function buildLeadsWhereConditions(
  userId: string,
  filters: Pick<NormalizedLeadsFilters, "search" | "status" | "source">,
) {
  const sourceLabel = sql<string>`coalesce(nullif(trim(${leads.source}), ''), 'Unspecified')`;
  const conditions = [eq(leads.userId, userId)];

  if (filters.search) {
    conditions.push(
      or(
        ilike(leads.fullName, `%${filters.search}%`),
        ilike(leads.company, `%${filters.search}%`),
        ilike(leads.email, `%${filters.search}%`),
        ilike(sourceLabel, `%${filters.search}%`),
      )!,
    );
  }

  if (filters.status) {
    conditions.push(eq(leads.status, filters.status as LeadStatus));
  }

  if (filters.source) {
    conditions.push(eq(sourceLabel, filters.source));
  }

  return { conditions, sourceLabel };
}

export function getLeadsSortOrder(
  sortBy: LeadsTableSortField,
  sortDir: LeadsTableSortDirection,
) {
  const statusSortWeight = sql<number>`case
    when ${leads.status} = 'New' then 1
    when ${leads.status} = 'Contacted' then 2
    when ${leads.status} = 'Interested' then 3
    when ${leads.status} = 'Proposal Sent' then 4
    when ${leads.status} = 'Closed' then 5
    when ${leads.status} = 'Lost' then 6
    else 7
  end`;

  const sortValues: Record<LeadsTableSortField, SQL> = {
    fullName: sql`lower(${leads.fullName})`,
    company: sql`lower(coalesce(${leads.company}, ''))`,
    status: statusSortWeight,
    source: sql`lower(coalesce(nullif(trim(${leads.source}), ''), 'Unspecified'))`,
    createdAt: sql`${leads.createdAt}`,
  };

  const sortValue = sortValues[sortBy];
  const primarySort = sortDir === "asc" ? asc(sortValue) : desc(sortValue);
  const secondarySort =
    sortBy === "createdAt"
      ? asc(sql<string>`lower(${leads.fullName})`)
      : desc(leads.createdAt);

  return { primarySort, secondarySort };
}

export async function getLeadsList(filters: LeadsListFilters): Promise<LeadsListResult> {
  const userId = await requireUserId();
  const {
    search,
    status,
    source,
    sortBy,
    sortDir,
    requestedPage,
    pageSize,
  } = normalizeLeadsFilters(filters);
  const { conditions, sourceLabel } = buildLeadsWhereConditions(userId, {
    search,
    status,
    source,
  });
  const sourceCount = sql<number>`count(*)`;

  const [countRow] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(leads)
    .where(and(...conditions));

  const totalCount = Number(countRow?.count ?? 0);
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const offset = (page - 1) * pageSize;

  const { primarySort, secondarySort } = getLeadsSortOrder(sortBy, sortDir);

  const rows = await db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      company: leads.company,
      email: leads.email,
      phone: leads.phone,
      status: leads.status,
      source: leads.source,
      sourceLabel,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(and(...conditions))
    .orderBy(primarySort, secondarySort, asc(leads.id))
    .limit(pageSize)
    .offset(offset);

  const sourceRows = await db
    .select({
      label: sourceLabel,
      count: sourceCount,
    })
    .from(leads)
    .where(eq(leads.userId, userId))
    .groupBy(sourceLabel)
    .orderBy(desc(sourceCount), asc(sourceLabel));

  return {
    leads: rows.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      company: row.company,
      email: row.email,
      phone: row.phone,
      status: row.status,
      source: row.source,
      sourceLabel: row.sourceLabel,
      createdAt: row.createdAt.toISOString(),
    })),
    totalCount,
    page,
    pageCount,
    pageSize,
    search,
    status,
    source,
    sortBy,
    sortDir,
    sourceOptions: sourceRows.map((item) => ({
      label: item.label,
      count: Number(item.count ?? 0),
    })),
  };
}
