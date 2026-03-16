import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";

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

export async function getCurrentViewer() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await currentUser();

  return {
    userId,
    user,
  };
}

export async function requireOwnedLead(leadId: string) {
  const userId = await requireUserId();

  const lead = await db.query.leads.findFirst({
    where: and(eq(leads.id, leadId), eq(leads.userId, userId)),
  });

  if (!lead) {
    notFound();
  }

  return {
    userId,
    lead,
  };
}

export function scopeToUser<T extends { userId: string }>(
  values: Omit<T, "userId">,
  userId: string,
): T {
  return {
    ...values,
    userId,
  } as T;
}