export const LEADS_TABLE_SORT_FIELDS = [
  "fullName",
  "company",
  "status",
  "source",
  "createdAt",
] as const;

export type LeadsTableSortField = (typeof LEADS_TABLE_SORT_FIELDS)[number];
export type LeadsTableSortDirection = "asc" | "desc";

export const LEADS_TABLE_PAGE_SIZES = [10, 20, 50] as const;

export const DEFAULT_LEADS_TABLE_SORT_FIELD: LeadsTableSortField = "createdAt";
export const DEFAULT_LEADS_TABLE_SORT_DIRECTION: LeadsTableSortDirection =
  "desc";
export const DEFAULT_LEADS_TABLE_PAGE_SIZE = LEADS_TABLE_PAGE_SIZES[0];
