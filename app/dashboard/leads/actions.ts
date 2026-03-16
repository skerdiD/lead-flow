"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { activityEvents, leads } from "@/db/schema";
import { ensureActivitySchema } from "@/lib/activity-schema";
import { requireUserId } from "@/lib/auth";
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

type LeadActivityEventType =
  | "lead_created"
  | "lead_updated"
  | "lead_status_changed"
  | "lead_deleted";

async function createLeadActivity(params: {
  userId: string;
  eventType: LeadActivityEventType;
  message: string;
  leadId?: string | null;
  leadName?: string | null;
}) {
  try {
    await ensureActivitySchema();

    await db.insert(activityEvents).values({
      userId: params.userId,
      eventType: params.eventType,
      message: params.message,
      leadId: params.leadId ?? null,
      leadName: params.leadName ?? null,
    });
  } catch {
    // Activity logging should not block lead mutations.
  }
}

export async function createLeadAction(
  input: LeadFormValues,
): Promise<LeadMutationState> {
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
      .returning({
        id: leads.id,
        fullName: leads.fullName,
      });

    await createLeadActivity({
      userId,
      eventType: "lead_created",
      message: `Lead created: ${createdLead.fullName}`,
      leadId: createdLead.id,
      leadName: createdLead.fullName,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/activity");

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
    const [existingLead] = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
        status: leads.status,
      })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.userId, userId)))
      .limit(1);

    if (!existingLead) {
      return {
        success: false,
        message: "This lead could not be found.",
      };
    }

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
      .where(and(eq(leads.id, leadId), eq(leads.userId, userId)))
      .returning({
        id: leads.id,
        fullName: leads.fullName,
        status: leads.status,
      });

    if (!updatedLead) {
      return {
        success: false,
        message: "This lead could not be found.",
      };
    }

    const statusChanged = existingLead.status !== updatedLead.status;

    await createLeadActivity({
      userId,
      eventType: statusChanged ? "lead_status_changed" : "lead_updated",
      message: statusChanged
        ? `Lead status changed: ${updatedLead.fullName} (${existingLead.status} -> ${updatedLead.status})`
        : `Lead updated: ${updatedLead.fullName}`,
      leadId: updatedLead.id,
      leadName: updatedLead.fullName,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/activity");
    revalidatePath(`/dashboard/leads/${leadId}`);
    revalidatePath(`/dashboard/leads/${leadId}/edit`);

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
  const userId = await requireUserId();

  try {
    const [deletedLead] = await db
      .delete(leads)
      .where(and(eq(leads.id, leadId), eq(leads.userId, userId)))
      .returning({
        id: leads.id,
        fullName: leads.fullName,
      });

    if (!deletedLead) {
      return {
        success: false,
        message: "This lead could not be found or you do not have access to it.",
      };
    }

    await createLeadActivity({
      userId,
      eventType: "lead_deleted",
      message: `Lead deleted: ${deletedLead.fullName}`,
      leadId: deletedLead.id,
      leadName: deletedLead.fullName,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/activity");

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
