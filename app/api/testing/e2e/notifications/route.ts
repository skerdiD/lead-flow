import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications, workspaceMembers } from "@/db/schema";
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
  const [membership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  if (!membership) {
    return NextResponse.json(
      { error: "Create the test workspace before seeding notifications." },
      { status: 409 },
    );
  }

  const [notification] = await db
    .insert(notifications)
    .values({
      workspaceId: membership.workspaceId,
      userId,
      type: "task_due",
      title: "Task due today",
      message: "Follow up with Acme is due today.",
      actionUrl: "/dashboard/tasks",
      metadata: { entityType: "task", entityId: "e2e-task" },
      dedupeKey: "e2e:task-due",
    })
    .onConflictDoUpdate({
      target: [
        notifications.workspaceId,
        notifications.userId,
        notifications.dedupeKey,
      ],
      set: { readAt: null, createdAt: new Date() },
    })
    .returning({ id: notifications.id });

  return NextResponse.json({ id: notification?.id });
}
