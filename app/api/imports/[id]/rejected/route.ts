import { NextResponse } from "next/server";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/arcjet";
import {
  buildRejectedRowsCsv,
  getImportAuthorization,
  ImportServiceError,
} from "@/lib/imports/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const access = await getImportAuthorization();
    const protection = await enforceRateLimit({ action: "lead:export", actorUserId: access.userId, workspaceId: access.workspace.id, request });
    if (!protection.ok) return NextResponse.json({ error: protection.message }, { status: protection.status, headers: rateLimitHeaders(protection) });
    const { id } = await context.params;
    const result = await buildRejectedRowsCsv(id);
    return new Response(result.csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const status = error instanceof ImportServiceError ? error.status : 500;
    return NextResponse.json(
      {
        error:
          error instanceof ImportServiceError
            ? error.message
            : "Rejected rows could not be downloaded.",
      },
      { status },
    );
  }
}
