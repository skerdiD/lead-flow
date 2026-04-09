import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { activityEvents, leadNotes, leads } from "@/db/schema";

export const runtime = "nodejs";

export async function POST() {
  if (process.env.E2E_TEST_MODE !== "1") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const userId = process.env.E2E_USER_ID || "e2e-user";

  await db.delete(leadNotes).where(eq(leadNotes.userId, userId));
  await db.delete(activityEvents).where(eq(activityEvents.userId, userId));
  await db.delete(leads).where(eq(leads.userId, userId));

  return NextResponse.json({ ok: true });
}
