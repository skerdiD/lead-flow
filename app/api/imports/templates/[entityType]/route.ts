import { NextResponse } from "next/server";
import { importEntityTypes } from "@/db/schema";
import { buildSafeCsv } from "@/lib/imports/csv";
import { IMPORT_TEMPLATES } from "@/lib/imports/config";
import {
  getImportAuthorization,
  ImportServiceError,
} from "@/lib/imports/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ entityType: string }> },
) {
  try {
    await getImportAuthorization();
    const { entityType } = await context.params;
    if (
      !importEntityTypes.includes(
        entityType as (typeof importEntityTypes)[number],
      )
    ) {
      return NextResponse.json(
        { error: "This import template is not supported." },
        { status: 404 },
      );
    }
    const csv = buildSafeCsv(
      IMPORT_TEMPLATES[entityType as (typeof importEntityTypes)[number]],
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leadflow-${entityType}-template.csv"`,
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
            : "The template could not be downloaded.",
      },
      { status },
    );
  }
}
