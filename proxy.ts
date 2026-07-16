import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { isSafeE2ETestMode } from "@/lib/e2e-test-mode";

const isPublicRoute = createRouteMatcher([
  "/",
  "/demo(.*)",
  "/api/demo-login",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isSafeE2ETestMode()) {
    return;
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
