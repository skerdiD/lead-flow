import "server-only";

import { createHash } from "node:crypto";
import { auditLogs, type workspaceRoles } from "@/db/schema";
import type { InsertDatabaseClient } from "@/lib/db-client";
import { redact } from "@/lib/logger.server";
import { getRequestId } from "@/lib/request-context.server";

export const auditActions = [
  "workspace.created", "workspace.updated", "workspace.deleted", "member.invited", "member.invitation_accepted", "member.invitation_revoked", "member.role_changed", "member.removed", "workspace.ownership_transferred",
  "lead.created", "lead.updated", "lead.archived", "lead.deleted", "deal.created", "deal.updated", "deal.stage_changed", "deal.archived", "deal.deleted", "account.created", "account.updated", "account.archived", "account.deleted", "contact.created", "contact.updated", "contact.archived", "contact.deleted", "task.created", "task.updated", "task.completed", "task.reopened", "task.deleted", "note.deleted", "crm.import.completed", "export.created", "demo.mutation_blocked", "authorization.forbidden",
] as const;
export type AuditAction = (typeof auditActions)[number];
export type AuditEntityType = "workspace" | "member" | "invitation" | "lead" | "deal" | "account" | "contact" | "task" | "note" | "import" | "export" | "authorization";
export type AuditActorRole = (typeof workspaceRoles)[number] | "system";

type AuditState = Record<string, unknown> | undefined;

export function auditDiff(before: AuditState, after: AuditState) {
  const beforeChanges: Record<string, unknown> = {};
  const afterChanges: Record<string, unknown> = {};
  for (const key of new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])) {
    if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) {
      beforeChanges[key] = before?.[key] ?? null;
      afterChanges[key] = after?.[key] ?? null;
    }
  }
  return { before: Object.keys(beforeChanges).length ? redact(beforeChanges) as Record<string, unknown> : undefined, after: Object.keys(afterChanges).length ? redact(afterChanges) as Record<string, unknown> : undefined };
}

export function safeNetworkContext(request?: Request) {
  if (!request) return {};
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const salt = process.env.AUDIT_IP_HASH_SALT;
  return {
    ipHash: ip && salt ? createHash("sha256").update(`${salt}:${ip}`).digest("hex") : undefined,
    userAgentSummary: request.headers.get("user-agent")?.replace(/[\r\n]/g, " ").slice(0, 160) || undefined,
  };
}

export async function writeAuditEvent(input: {
  tx: InsertDatabaseClient;
  workspaceId: string;
  actor: { userId: string; role: AuditActorRole };
  action: AuditAction;
  entity: { type: AuditEntityType; id?: string | null };
  before?: AuditState;
  after?: AuditState;
  metadata?: Record<string, unknown>;
  requestId?: string;
  network?: ReturnType<typeof safeNetworkContext>;
  eventKey?: string;
}) {
  const diff = auditDiff(input.before, input.after);
  await input.tx.insert(auditLogs).values({
    workspaceId: input.workspaceId,
    actorUserId: input.actor.userId,
    actorRole: input.actor.role,
    action: input.action,
    entityType: input.entity.type,
    entityId: input.entity.id ?? null,
    requestId: input.requestId ?? await getRequestId(),
    before: diff.before,
    after: diff.after,
    metadata: input.metadata ? redact(input.metadata) as Record<string, unknown> : undefined,
    ipHash: input.network?.ipHash,
    userAgentSummary: input.network?.userAgentSummary,
    eventKey: input.eventKey,
  }).onConflictDoNothing();
}
