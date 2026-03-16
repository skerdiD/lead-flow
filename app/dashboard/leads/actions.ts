"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { requireUserId } from "@/lib/auth";

export async function deleteLeadAction(leadId: string) {
  const userId = await requireUserId();

  await db
    .delete(leads)
    .where(and(eq(leads.id, leadId), eq(leads.userId, userId)));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
}