import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { activityEvents, leadNotes, leads } from "@/db/schema";
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

  await db.delete(leadNotes).where(eq(leadNotes.userId, userId));
  await db.delete(activityEvents).where(eq(activityEvents.userId, userId));
  await db.delete(leads).where(eq(leads.userId, userId));

  return NextResponse.json({ ok: true });
}
