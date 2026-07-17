import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { observeDatabaseOperation } from "@/lib/database-observability.server";
import { logger } from "@/lib/logger.server";
import { createRequestId, requestIdHeaders, REQUEST_ID_HEADER } from "@/lib/request-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEALTH_TIMEOUT_MS = 1_500;

function withTimeout<T>(operation: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("Health database check timed out")), timeoutMs);
  });
  return Promise.race([operation, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

export async function GET(request: Request) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const headers = requestIdHeaders(requestId);

  try {
    await withTimeout(
      observeDatabaseOperation("health_check", () => db.execute(sql`select 1`)),
      HEALTH_TIMEOUT_MS,
    );
    return NextResponse.json(
      { status: "ok", timestamp: new Date().toISOString(), version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) },
      { headers: { ...headers, "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logger.error("health_check_failed", "Readiness database check failed.", {
      requestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { status: "unavailable", requestId },
      { status: 503, headers: { ...headers, "Cache-Control": "no-store" } },
    );
  }
}
