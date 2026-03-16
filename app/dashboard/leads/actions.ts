"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { protectLeadMutation } from "@/lib/arcjet";
import { whereOwnedLead } from "@/lib/leads";
import { leadFormSchema, type LeadFormValues } from "@/lib/validations/lead";

export type LeadMutationState =
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

export type DeleteLeadActionState =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message: string;
    };

export async function createLeadAction(
  input: LeadFormValues,
): Promise<LeadMutationState> {
  const protection = await protectLeadMutation();

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
    };
  }

  const userId = await requireUserId();
  const parsed = leadFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Please review the form and fix the highlighted fields.",
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
      message: "We couldn’t create this lead right now. Please try again.",
    };
  }
}

export async function updateLeadAction(
  leadId: string,
  input: LeadFormValues,
): Promise<LeadMutationState> {
  const normalizedLeadId = leadId.trim();

  if (!normalizedLeadId) {
    return {
      success: false,
      message: "Invalid lead ID.",
    };
  }

  const protection = await protectLeadMutation();

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
    };
  }

  const userId = await requireUserId();
  const parsed = leadFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Please review the form and fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const [updatedLead] = await db
      .update(leads)
      .set({
        fullName: parsed.data.fullName,
        company: parsed.data.company ?? null,
        email: parsed.data.email ?? null,
        phone: parsed.data.phone ?? null,
        status: parsed.data.status,
        source: parsed.data.source ?? null,
        notes: parsed.data.notes ?? null,
        updatedAt: new Date(),
      })
      .where(whereOwnedLead(userId, normalizedLeadId))
      .returning({ id: leads.id });

    if (!updatedLead) {
      return {
        success: false,
        message: "This lead could not be found.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/leads");
    revalidatePath(`/dashboard/leads/${normalizedLeadId}`);
    revalidatePath(`/dashboard/leads/${normalizedLeadId}/edit`);

    return {
      success: true,
      leadId: updatedLead.id,
      message: "Lead updated successfully.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn’t save your changes right now. Please try again.",
    };
  }
}

export async function deleteLeadAction(
  leadId: string,
): Promise<DeleteLeadActionState> {
  const normalizedLeadId = leadId.trim();

  if (!normalizedLeadId) {
    return {
      success: false,
      message: "Invalid lead ID.",
    };
  }

  const protection = await protectLeadMutation();

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
    };
  }

  const userId = await requireUserId();

  try {
    const [deletedLead] = await db
      .delete(leads)
      .where(whereOwnedLead(userId, normalizedLeadId))
      .returning({ id: leads.id });

    if (!deletedLead) {
      return {
        success: false,
        message: "This lead could not be found or you do not have access to it.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/leads");

    return {
      success: true,
      message: "Lead deleted successfully.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn’t delete this lead right now. Please try again.",
    };
  }
}