import { NextResponse } from "next/server";
import { protectDemoLogin } from "@/lib/arcjet";
import { createDemoSignInUrl, DemoLoginError } from "@/lib/demo-auth.server";
import { isDemoRole } from "@/lib/demo";
import { isSafeE2ETestMode } from "@/lib/e2e-test-mode";
import { logger } from "@/lib/logger.server";
import { createRequestId, requestIdHeaders, REQUEST_ID_HEADER } from "@/lib/request-id";
import { E2E_WORKSPACE_ROLE_COOKIE } from "@/lib/workspaces";

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
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const responseHeaders = requestIdHeaders(requestId);
  const protection = await protectDemoLogin();
  if (!protection.ok) {
    return NextResponse.json(
      { error: protection.message, requestId },
      { status: protection.status, headers: responseHeaders },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: INVALID_DEMO_REQUEST_MESSAGE, requestId },
      { status: 400, headers: responseHeaders },
    );
  }

  const role = readDemoRoleRequest(payload);
  if (!role) {
    logger.warn("security_demo_role_verification_failed", "Demo login request used an invalid role payload.", {
      requestId,
      route: "/api/demo-login",
      method: "POST",
      statusCode: 400,
    });
    return NextResponse.json(
      { error: INVALID_DEMO_REQUEST_MESSAGE, requestId },
      { status: 400, headers: responseHeaders },
    );
  }

  // E2E mode already supplies an authenticated local test user. Avoid making
  // the external Clerk request with the intentionally inert CI credentials;
  // the role cookie gives tests the same authorization perspective instead.
  if (isSafeE2ETestMode()) {
    const response = NextResponse.json(
      { signInUrl: "/dashboard" },
      { headers: responseHeaders },
    );
    response.cookies.set(E2E_WORKSPACE_ROLE_COOKIE, role, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
    });
    return response;
  }

  try {
    const signInUrl = await createDemoSignInUrl(role);
    return NextResponse.json({ signInUrl }, { headers: responseHeaders });
  } catch (error) {
    const status = error instanceof DemoLoginError ? error.status : 503;
    const internalMessage =
      error instanceof DemoLoginError
        ? error.internalMessage
        : error instanceof Error
          ? error.message
          : "Unknown demo login error.";

    logger.error("demo_login_failed", "Demo login could not be prepared.", {
      requestId,
      role,
      errorName: internalMessage,
    });

    return NextResponse.json(
      {
        error: "We couldn't prepare this demo role right now. Please try again.",
        requestId,
      },
      { status, headers: responseHeaders },
    );
  }
}
