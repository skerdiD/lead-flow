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
  return value?.trim() ?? "";
}

function normalizeStatus(value?: string) {
  if (!value) return "";
  return LEAD_STATUSES.includes(value as LeadStatus) ? value : "";
}

function normalizeSource(value?: string) {
  return value?.trim() ?? "";
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

export async function getLeadsList(filters: LeadsListFilters): Promise<LeadsListResult> {
  const userId = await requireUserId();

  const search = normalizeSearch(filters.search);
  const status = normalizeStatus(filters.status);
  const source = normalizeSource(filters.source);
  const sortBy = normalizeSortBy(filters.sortBy);
  const sortDir = normalizeSortDirection(filters.sortDir);
  const requestedPage = normalizePositiveInteger(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);

  const sourceLabel = sql<string>`coalesce(nullif(trim(${leads.source}), ''), 'Unspecified')`;
  const sourceCount = sql<number>`count(*)`;
  const statusSortWeight = sql<number>`case
    when ${leads.status} = 'New' then 1
    when ${leads.status} = 'Contacted' then 2
    when ${leads.status} = 'Interested' then 3
    when ${leads.status} = 'Proposal Sent' then 4
    when ${leads.status} = 'Closed' then 5
    when ${leads.status} = 'Lost' then 6
    else 7
  end`;

  const conditions = [eq(leads.userId, userId)];

  if (search) {
    conditions.push(
      or(
        ilike(leads.fullName, `%${search}%`),
        ilike(leads.company, `%${search}%`),
        ilike(leads.email, `%${search}%`),
        ilike(sourceLabel, `%${search}%`),
      )!,
    );
  }

  if (status) {
    conditions.push(eq(leads.status, status as LeadStatus));
  }

  if (source) {
    conditions.push(eq(sourceLabel, source));
  }

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

  const sortValues: Record<LeadsTableSortField, SQL> = {
    fullName: sql`lower(${leads.fullName})`,
    company: sql`lower(coalesce(${leads.company}, ''))`,
    status: statusSortWeight,
    source: sql`lower(${sourceLabel})`,
    createdAt: sql`${leads.createdAt}`,
  };

  const sortValue = sortValues[sortBy];
  const primarySort = sortDir === "asc" ? asc(sortValue) : desc(sortValue);
  const secondarySort =
    sortBy === "createdAt"
      ? asc(sql<string>`lower(${leads.fullName})`)
      : desc(leads.createdAt);

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
