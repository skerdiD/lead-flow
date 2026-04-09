import { and, asc, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { leads } from "@/db/schema";
import {
  buildLeadsWhereConditions,
  getLeadsSortOrder,
  normalizeLeadsFilters,
  type LeadsListFilters,
} from "@/app/dashboard/leads/queries";
import { requireUserId } from "@/lib/auth";
import { buildLeadsCsv, buildLeadsPdf } from "@/lib/leads-export";

export const runtime = "nodejs";

function normalizeSelectedIds(rawSelected: string | null) {
  if (!rawSelected) return [];

  return Array.from(
    new Set(
      rawSelected
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).slice(0, 500);
}

export async function GET(request: Request) {
  const userId = await requireUserId();
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") || "csv").toLowerCase();

  if (format !== "csv" && format !== "pdf") {
    return NextResponse.json(
      { error: "Unsupported export format." },
      { status: 400 },
    );
  }

  const filters: LeadsListFilters = {
    search: searchParams.get("search") || undefined,
    status: searchParams.get("status") || undefined,
    source: searchParams.get("source") || undefined,
    sortBy: searchParams.get("sortBy") || undefined,
    sortDir: searchParams.get("sortDir") || undefined,
  };

  const normalized = normalizeLeadsFilters(filters);
  const selectedIds = normalizeSelectedIds(searchParams.get("selected"));
  const { conditions, sourceLabel } = buildLeadsWhereConditions(userId, normalized);
  const { primarySort, secondarySort } = getLeadsSortOrder(
    normalized.sortBy,
    normalized.sortDir,
  );

  if (selectedIds.length > 0) {
    conditions.push(inArray(leads.id, selectedIds));
  }

  const rows = await db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      company: leads.company,
      email: leads.email,
      phone: leads.phone,
      status: leads.status,
      sourceLabel,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(and(...conditions))
    .orderBy(primarySort, secondarySort, asc(leads.id));

  const exportedAt = new Date();
  const metadata = {
    exportedAt,
    search: normalized.search,
    status: normalized.status,
    source: normalized.source,
    totalCount: rows.length,
    selectedCount: selectedIds.length || undefined,
  };

  const filenameDate = exportedAt.toISOString().slice(0, 19).replace(/:/g, "-");
  const disposition = `attachment; filename="leadflow-leads-${filenameDate}.${format}"`;

  if (format === "csv") {
    const csv = buildLeadsCsv(rows, metadata);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": disposition,
        "Cache-Control": "no-store",
      },
    });
  }

  const pdfBytes = await buildLeadsPdf(rows, metadata);
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
      "Cache-Control": "no-store",
    },
  });
}
