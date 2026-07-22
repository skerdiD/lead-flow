import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  accounts,
  activityEvents,
  auditLogs,
  contacts,
  crmTasks,
  deals,
  importJobs,
  leadNotes,
  leads,
  notifications,
  workspaceInvitations,
} from "@/db/schema";
import { isSafeE2ETestMode } from "@/lib/e2e-test-mode";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSafeE2ETestMode()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const secret = process.env.E2E_TEST_SECRET;
  const requestSecret = request.headers.get("x-e2e-test-secret");

  if (!secret || requestSecret !== secret) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const userId = process.env.E2E_USER_ID || "e2e-user";

  await db.delete(auditLogs).where(eq(auditLogs.actorUserId, userId));
  await db.delete(importJobs).where(eq(importJobs.actorUserId, userId));
  await db.delete(notifications).where(eq(notifications.userId, userId));
  await db.delete(leadNotes).where(eq(leadNotes.userId, userId));
  await db.delete(activityEvents).where(eq(activityEvents.userId, userId));
  await db.delete(workspaceInvitations).where(eq(workspaceInvitations.createdByUserId, userId));
  await db.delete(crmTasks).where(eq(crmTasks.userId, userId));
  await db.delete(deals).where(eq(deals.userId, userId));
  await db.delete(leads).where(eq(leads.userId, userId));
  await db.delete(contacts).where(eq(contacts.userId, userId));
  await db.delete(accounts).where(eq(accounts.userId, userId));

  return NextResponse.json({ ok: true });
}
