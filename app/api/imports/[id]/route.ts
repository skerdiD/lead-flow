import { NextResponse } from "next/server";
import { protectCsvImport } from "@/lib/arcjet";
import {
  getImportJobDetails,
  ImportServiceError,
  reviewImportJob,
} from "@/lib/imports/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const protection = await protectCsvImport();
  if (!protection.ok) {
    return NextResponse.json(
      { error: protection.message },
      { status: protection.status },
    );
  }

  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    return NextResponse.json(
      await getImportJobDetails(id, {
        page: Number.parseInt(searchParams.get("page") ?? "1", 10) || 1,
        filter: searchParams.get("filter") ?? "all",
      }),
    );
  } catch (error) {
    const status = error instanceof ImportServiceError ? error.status : 500;
    return NextResponse.json(
      {
        error:
          error instanceof ImportServiceError
            ? error.message
            : "The import details could not be loaded.",
      },
      { status },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const protection = await protectCsvImport();
  if (!protection.ok) {
    return NextResponse.json(
      { error: protection.message },
      { status: protection.status },
    );
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      mapping?: Record<string, string | null>;
      duplicateStrategy?: string;
    };
    if (!body.mapping || typeof body.mapping !== "object") {
      return NextResponse.json(
        { error: "Choose how the CSV columns should be mapped." },
        { status: 400 },
      );
    }
    if (
      !["skip", "update", "create_new"].includes(
        body.duplicateStrategy ?? "",
      )
    ) {
      return NextResponse.json(
        { error: "Choose how duplicate rows should be handled." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      await reviewImportJob({
        jobId: id,
        mapping: body.mapping,
        duplicateStrategy: body.duplicateStrategy as
          | "skip"
          | "update"
          | "create_new",
      }),
    );
  } catch (error) {
    const status = error instanceof ImportServiceError ? error.status : 500;
    return NextResponse.json(
      {
        error:
          error instanceof ImportServiceError
            ? error.message
            : "The import could not be validated.",
      },
      { status },
    );
  }
}
