import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isSafeE2ETestMode } from "@/lib/e2e-test-mode";

const getCachedAuth = cache(async () => auth());
const getCachedCurrentUser = cache(async () => currentUser());

function getE2ETestUserId() {
  if (!isSafeE2ETestMode()) return null;
  return process.env.E2E_USER_ID || "e2e-user";
}

export async function getCurrentUserId() {
  const e2eUserId = getE2ETestUserId();
  if (e2eUserId) return e2eUserId;

  const { userId } = await getCachedAuth();
  return userId ?? null;
}

export async function requireUserId() {
  const e2eUserId = getE2ETestUserId();
  if (e2eUserId) return e2eUserId;

  const { userId, redirectToSignIn } = await getCachedAuth();

  if (!userId) {
    return redirectToSignIn();
  }

  return userId;
}

export async function requireCurrentUser() {
  const userId = await requireUserId();

  if (isSafeE2ETestMode()) {
    return {
      userId,
      user: {
        id: userId,
      },
    };
  }

  const user = await getCachedCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return {
    userId,
    user,
  };
}
