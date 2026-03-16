"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { leadFormSchema, type LeadFormValues } from "@/lib/validations/lead";

export type CreateLeadActionState =
  | {
      success: true;
      leadId: string;
      message: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Partial<Record<keyof LeadFormValues, string[]>>;
    };

export async function createLeadAction(
  input: LeadFormValues,
): Promise<CreateLeadActionState> {
  const userId = await requireUserId();

  const parsed = leadFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const [createdLead] = await db
      .insert(leads)
      .values({
        userId,
        fullName: parsed.data.fullName,
        company: parsed.data.company ?? null,
        email: parsed.data.email ?? null,
        phone: parsed.data.phone ?? null,
        status: parsed.data.status,
        source: parsed.data.source ?? null,
        notes: parsed.data.notes ?? null,
      })
      .returning({ id: leads.id });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/leads");

    return {
      success: true,
      leadId: createdLead.id,
      message: "Lead created successfully.",
    };
  } catch {
    return {
      success: false,
      message: "Something went wrong while creating the lead.",
    };
  }
}
