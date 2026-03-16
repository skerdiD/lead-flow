import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cache } from "react";

const getCachedAuth = cache(async () => auth());
const getCachedCurrentUser = cache(async () => currentUser());

export async function getCurrentUserId() {
  const { userId } = await getCachedAuth();
  return userId ?? null;
}

export async function requireUserId() {
  const { userId, redirectToSignIn } = await getCachedAuth();

  if (!userId) {
    return redirectToSignIn();
  }

  return userId;
}

export async function requireCurrentUser() {
  const userId = await requireUserId();
  const user = await getCachedCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return {
    userId,
    user,
  };
}
