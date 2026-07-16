import { NextResponse } from "next/server";
import { protectCsvImport } from "@/lib/arcjet";
import {
  confirmImportJob,
  ImportServiceError,
} from "@/lib/imports/server";

export const runtime = "nodejs";

export async function POST(
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
