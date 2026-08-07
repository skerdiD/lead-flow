import { NextResponse } from "next/server";
import { importEntityTypes } from "@/db/schema";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/arcjet";
import { CsvImportError } from "@/lib/imports/csv";
import { logImportEvent } from "@/lib/imports/logging";
import {
  createImportDraft,
  getImportAuthorization,
  ImportServiceError,
} from "@/lib/imports/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const access = await getImportAuthorization();
    const protection = await enforceRateLimit({ action: "csv:import", actorUserId: access.userId, workspaceId: access.workspace.id, request });
    if (!protection.ok) {
      logImportEvent("warn", "import_rate_limit_rejected", { status: protection.status });
      return NextResponse.json({ error: protection.message }, { status: protection.status, headers: rateLimitHeaders(protection) });
    }
    const formData = await request.formData();
    const file = formData.get("file");
    const entityType = formData.get("entityType");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a CSV file." }, { status: 400 });
    }
    if (
      typeof entityType !== "string" ||
      !importEntityTypes.includes(entityType as (typeof importEntityTypes)[number])
    ) {
      return NextResponse.json(
        { error: "Choose a supported record type." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      await createImportDraft(
        file,
        entityType as (typeof importEntityTypes)[number],
      ),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CsvImportError || error instanceof ImportServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    logImportEvent("error", "import_upload_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "The CSV could not be prepared for review." },
      { status: 500 },
    );
  }
}
