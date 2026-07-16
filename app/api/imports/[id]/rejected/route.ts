import { NextResponse } from "next/server";
import { protectCsvImport } from "@/lib/arcjet";
import {
  buildRejectedRowsCsv,
  ImportServiceError,
} from "@/lib/imports/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const protection = await protectCsvImport();
  if (!protection.ok) {
    return NextResponse.json(
      { error: protection.message },
      { status: protection.status },
    );
  }

  try {
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
