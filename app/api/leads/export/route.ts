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
import { enforceRateLimit, rateLimitHeaders } from "@/lib/arcjet";
import {
  getCurrentWorkspaceAuthorizationContext,
  hasWorkspacePermission,
  permissionDeniedMessage,
} from "@/lib/authorization";
import { buildLeadsCsv, buildLeadsPdf } from "@/lib/leads-export";
import { writeAuditEvent } from "@/lib/audit-log.server";
import { getRequestId } from "@/lib/request-context.server";
import { normalizeUuidList } from "@/lib/uuid";

export const runtime = "nodejs";

const EXPORT_ROW_LIMIT = 1000;

function normalizeSelectedIds(rawSelected: string | null) {
  if (!rawSelected) return [];

  return normalizeUuidList(rawSelected.split(","), 500);
}

export async function GET(request: Request) {
  const context = await getCurrentWorkspaceAuthorizationContext();
  const protection = await enforceRateLimit({
    action: "lead:export",
    actorUserId: context.userId,
    workspaceId: context.workspaceId,
    request,
  });

  if (!protection.ok) {
    return NextResponse.json(
      { error: protection.message },
      { status: protection.status, headers: rateLimitHeaders(protection) },
    );
  }

  if (!hasWorkspacePermission(context.role, "exports:create")) {
    return NextResponse.json(
      { error: permissionDeniedMessage("exports:create") },
      { status: 403 },
    );
  }

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
    owner: searchParams.get("owner") || undefined,
    archived: searchParams.get("archived") || undefined,
    sortBy: searchParams.get("sortBy") || undefined,
    sortDir: searchParams.get("sortDir") || undefined,
  };

  const normalized = normalizeLeadsFilters(filters);
  const selectedIds = normalizeSelectedIds(searchParams.get("selected"));
  const { conditions, sourceLabel } = buildLeadsWhereConditions(
    context.workspaceId,
    normalized,
    context,
  );
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
    .orderBy(primarySort, secondarySort, asc(leads.id))
    .limit(EXPORT_ROW_LIMIT + 1);

  if (rows.length > EXPORT_ROW_LIMIT) {
    return NextResponse.json(
      {
        error: `Export is limited to ${EXPORT_ROW_LIMIT} leads. Narrow the filters or select specific leads and try again.`,
      },
      { status: 413 },
    );
  }

  const exportedAt = new Date();
  const metadata = {
    exportedAt,
    search: normalized.search,
    status: normalized.status,
    source: normalized.source,
    totalCount: rows.length,
    selectedCount: selectedIds.length || undefined,
  };
  const fileBody =
    format === "csv"
      ? buildLeadsCsv(rows, metadata)
      : Buffer.from(await buildLeadsPdf(rows, metadata));

  // Export access is security-sensitive even though it is read-only. Record
  // only bounded, non-sensitive metadata; never persist free-text search
  // terms, selected record IDs, or generated file contents in the audit log.
  await db.transaction(async (tx) => {
    await writeAuditEvent({
      tx,
      workspaceId: context.workspaceId,
      actor: { userId: context.userId, role: context.role },
      action: "export.created",
      entity: { type: "export" },
      requestId: await getRequestId(),
      metadata: {
        format,
        rowCount: rows.length,
        selectedCount: selectedIds.length,
        statusFilterApplied: Boolean(normalized.status),
        sourceFilterApplied: Boolean(normalized.source),
        ownerFilterApplied: Boolean(normalized.owner),
        searchFilterApplied: Boolean(normalized.search),
        archived: normalized.archived,
      },
    });
  });

  const filenameDate = exportedAt.toISOString().slice(0, 19).replace(/:/g, "-");
  const disposition = `attachment; filename="leadflow-leads-${filenameDate}.${format}"`;

  if (format === "csv") {
    return new Response(fileBody, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": disposition,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return new Response(fileBody, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
