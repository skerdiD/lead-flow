import "server-only";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import {
  getCurrentWorkspaceAuthorizationContext,
  hasWorkspacePermission,
} from "@/lib/authorization";

const AUDIT_PAGE_SIZE = 40;

export class AuditLogAccessError extends Error {
  constructor() {
    super("This workspace area could not be found.");
    this.name = "AuditLogAccessError";
  }
}

export async function getAuthorizedAuditLogPage(input: {
  search?: string;
  page?: number;
} = {}) {
  const context = await getCurrentWorkspaceAuthorizationContext();

  if (!hasWorkspacePermission(context.role, "workspace:manage")) {
    throw new AuditLogAccessError();
  }

  const search = input.search?.trim().slice(0, 120) ?? "";
  const requestedPage = Math.max(1, input.page ?? 1);
  const conditions = [eq(auditLogs.workspaceId, context.workspaceId)];

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(auditLogs.action, pattern),
        ilike(auditLogs.entityType, pattern),
        ilike(auditLogs.actorUserId, pattern),
        ilike(auditLogs.entityId, pattern),
        sql`${auditLogs.metadata}::text ilike ${pattern}`,
      )!,
    );
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(and(...conditions));
  const totalCount = Number(countRow?.count ?? 0);
  const pageCount = Math.max(1, Math.ceil(totalCount / AUDIT_PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const rows = await db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(AUDIT_PAGE_SIZE)
    .offset((page - 1) * AUDIT_PAGE_SIZE);

  return {
    rows,
    search,
    totalCount,
    page,
    pageCount,
    pageSize: AUDIT_PAGE_SIZE,
  };
}
