import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { isSafeE2ETestMode } from "@/lib/e2e-test-mode";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/request-id";
import {
  buildContentSecurityPolicy,
  generateCspNonce,
  resolveClerkFrontendApiOrigin,
} from "@/lib/security-headers";

const CSP_HEADER = "Content-Security-Policy";
const CSP_NONCE_HEADER = "x-nonce";

const isPublicRoute = createRouteMatcher([
  "/",
  "/demo(.*)",
  "/api/demo-login",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/invite(.*)",
]);

function securedNextResponse(req: NextRequest) {
  const requestId = createRequestId(req.headers.get(REQUEST_ID_HEADER));
  const nonce = generateCspNonce();
  const contentSecurityPolicy = buildContentSecurityPolicy({
    nonce,
    environment:
      process.env.NODE_ENV === "production" ? "production" : "development",
    clerkFrontendApiOrigin: resolveClerkFrontendApiOrigin(
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    ),
  });
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);
  requestHeaders.set(CSP_NONCE_HEADER, nonce);
  requestHeaders.set(CSP_HEADER, contentSecurityPolicy);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
    headers: { [REQUEST_ID_HEADER]: requestId },
  });
  response.headers.set(CSP_HEADER, contentSecurityPolicy);
  return response;
}

function e2eMiddleware(req: NextRequest) {
  return securedNextResponse(req);
}

const protectedMiddleware = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  return securedNextResponse(req);
});

export default isSafeE2ETestMode() ? e2eMiddleware : protectedMiddleware;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
