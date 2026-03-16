import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function getCurrentUserId() {
  const { userId } = await auth();
  return userId ?? null;
}

export async function requireUserId() {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  return userId;
}

export async function requireCurrentUser() {
  const userId = await requireUserId();
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return {
    userId,
    user,
  };
}