import { NextResponse } from "next/server";
import { protectDemoLogin } from "@/lib/arcjet";
import { createDemoSignInUrl, DemoLoginError } from "@/lib/demo-auth.server";
import { isDemoRole } from "@/lib/demo";

const INVALID_DEMO_REQUEST_MESSAGE =
  "Choose one of the available demo roles to continue.";

function readDemoRoleRequest(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const entries = Object.entries(value);
  if (entries.length !== 1 || entries[0]?.[0] !== "role") return null;

  const role = entries[0][1];
  return isDemoRole(role) ? role : null;
}

export async function POST(request: Request) {
  const protection = await protectDemoLogin();
  if (!protection.ok) {
    return NextResponse.json(
      { error: protection.message },
      { status: protection.status },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: INVALID_DEMO_REQUEST_MESSAGE },
      { status: 400 },
    );
  }

  const role = readDemoRoleRequest(payload);
  if (!role) {
    return NextResponse.json(
      { error: INVALID_DEMO_REQUEST_MESSAGE },
      { status: 400 },
    );
  }

  try {
    const signInUrl = await createDemoSignInUrl(role);
    return NextResponse.json({ signInUrl });
  } catch (error) {
    const status = error instanceof DemoLoginError ? error.status : 503;
    const internalMessage =
      error instanceof DemoLoginError
        ? error.internalMessage
        : error instanceof Error
          ? error.message
          : "Unknown demo login error.";

    console.error("Demo login could not be prepared.", {
      role,
      internalMessage,
    });

    return NextResponse.json(
      {
        error: "We couldn't prepare this demo role right now. Please try again.",
      },
      { status },
    );
  }
}
