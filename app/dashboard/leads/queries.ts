import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/constants/leads";

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

  const conditions = [
    eq(leads.userId, userId),
    ...(search
      ? [
          or(
            ilike(leads.fullName, `%${search}%`),
            ilike(leads.company, `%${search}%`),
            ilike(leads.email, `%${search}%`),
          ),
        ]
      : []),
    ...(status ? [eq(leads.status, status)] : []),
  ];

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
    .where(and(...conditions))
    .orderBy(desc(leads.createdAt));
}