import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isSafeE2ETestMode } from "@/lib/e2e-test-mode";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/request-id";

const isPublicRoute = createRouteMatcher([
  "/",
  "/demo(.*)",
  "/api/demo-login",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const requestId = createRequestId(req.headers.get(REQUEST_ID_HEADER));
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  if (isSafeE2ETestMode()) {
    return NextResponse.next({ request: { headers: requestHeaders }, headers: { [REQUEST_ID_HEADER]: requestId } });
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  return NextResponse.next({ request: { headers: requestHeaders }, headers: { [REQUEST_ID_HEADER]: requestId } });
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
