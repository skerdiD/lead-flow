import { NextResponse } from "next/server";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/arcjet";
import {
  confirmImportJob,
  getImportAuthorization,
  ImportServiceError,
} from "@/lib/imports/server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const access = await getImportAuthorization();
    const protection = await enforceRateLimit({ action: "csv:import", actorUserId: access.userId, workspaceId: access.workspace.id, request });
    if (!protection.ok) return NextResponse.json({ error: protection.message }, { status: protection.status, headers: rateLimitHeaders(protection) });
    const { id } = await context.params;
    return NextResponse.json(await confirmImportJob(id));
  } catch (error) {
    const status = error instanceof ImportServiceError ? error.status : 500;
    return NextResponse.json(
      {
        error:
          error instanceof ImportServiceError
            ? error.message
            : "The import could not be completed.",
      },
      { status },
    );
  }
}
