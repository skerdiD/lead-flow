import { and, desc, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/constants/leads";
import { whereLeadsBelongToUser } from "@/lib/leads";

export type LeadsListFilters = {
  search?: string;
  status?: string;
};

export async function getLeadsList(filters: LeadsListFilters) {
  const userId = await requireUserId();

  const search = filters.search?.trim();
  const status =
    filters.status && LEAD_STATUSES.includes(filters.status as LeadStatus)
      ? (filters.status as LeadStatus)
      : undefined;

  const predicates = [
    whereLeadsBelongToUser(userId),
    ...(search
      ? [
          or(
            ilike(leads.fullName, `%${search}%`),
            ilike(leads.company, `%${search}%`),
            ilike(leads.email, `%${search}%`),
          ),
        ]
      : []),
    ...(status ? [and()] : []),
  ].filter(Boolean);

  return db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      company: leads.company,
      email: leads.email,
      phone: leads.phone,
      status: leads.status,
      source: leads.source,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(
      and(
        whereLeadsBelongToUser(userId),
        ...(search
          ? [
              or(
                ilike(leads.fullName, `%${search}%`),
                ilike(leads.company, `%${search}%`),
                ilike(leads.email, `%${search}%`),
              ),
            ]
          : []),
        ...(status ? [leads.status.eq(status)] : []),
      ),
    )
    .orderBy(desc(leads.createdAt));
}