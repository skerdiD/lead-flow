import { db } from "@/db";
import { activityEvents } from "@/db/schema";
import type { LeadDbClient } from "./db-client";

export type LeadActivityEventType =
  | "lead_created"
  | "lead_updated"
  | "lead_status_changed"
  | "lead_deleted"
  | "lead_archived"
  | "lead_restored"
  | "lead_note_added"
  | "lead_note_updated"
  | "lead_note_deleted"
  | "task_created"
  | "task_completed"
  | "deal_stage_changed"
  | "lead_qualified";

export async function createLeadActivity(params: {
  /** Use the caller's transaction so the domain mutation and timeline entry are atomic. */
  client?: LeadDbClient;
  workspaceId: string;
  userId: string;
  eventType: LeadActivityEventType;
  message: string;
  leadId?: string | null;
  leadName?: string | null;
}) {
  const client = params.client ?? db;

  await client.insert(activityEvents).values({
    workspaceId: params.workspaceId,
    userId: params.userId,
    eventType: params.eventType,
    message: params.message,
    leadId: params.leadId ?? null,
    leadName: params.leadName ?? null,
  });
}
