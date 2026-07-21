"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { leadNotes, leads } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { DEMO_MUTATION_MESSAGE, isDemoWorkspace } from "@/lib/demo";
import { leadNoteSchema } from "@/lib/validations/lead-note";
import { getCurrentWorkspace } from "@/lib/workspaces";
import { createLeadActivity } from "../services/activity-service";
import {
  canAccessWorkspaceRecord,
  crmUpdatePermissionError,
  ensureLeadMutationAllowed,
  revalidateLeadPaths,
  workspacePermissionError,
} from "./shared";
import type { LeadNoteMutationState } from "./types";
import { isLeadActionId } from "../validations/action-inputs";
import { writeAuditEvent } from "@/lib/audit-log.server";
import { getRequestId } from "@/lib/request-context.server";

export async function createLeadNoteAction(
  leadId: string,
  content: string,
): Promise<LeadNoteMutationState> {
  if (!isLeadActionId(leadId)) {
    return {
      success: false,
      message: "This lead could not be found.",
    };
  }

  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();
  const parsed = leadNoteSchema.safeParse({ content });

  const permissionError = workspacePermissionError(workspace.role, "crm:create");
  if (permissionError) return { success: false, message: permissionError };

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
    };
  }

  if (isDemoWorkspace(workspace)) {
    return {
      success: false,
      message: DEMO_MUTATION_MESSAGE,
    };
  }

  if (!parsed.success) {
    return {
      success: false,
      message: "Please review your note and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const [lead] = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
        assignedOwnerUserId: leads.assignedOwnerUserId,
      })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspace.id)))
      .limit(1);

    if (!lead) {
      return {
        success: false,
        message: "This lead could not be found.",
      };
    }

    if (!canAccessWorkspaceRecord(workspace, userId, lead.assignedOwnerUserId, "update")) {
      return { success: false, message: "This lead could not be found or you do not have permission to update it." };
    }

    await db.transaction(async (tx) => {
      await tx.insert(leadNotes).values({
        workspaceId: workspace.id,
        userId,
        leadId,
        content: parsed.data.content,
      });

      await createLeadActivity({
        client: tx,
        workspaceId: workspace.id,
        userId,
        eventType: "lead_note_added",
        message: `Note added to ${lead.fullName}`,
        leadId: lead.id,
        leadName: lead.fullName,
      });
    });

    revalidateLeadPaths(leadId);

    return {
      success: true,
      message: "Note added.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn't save this note right now. Please try again.",
    };
  }
}


export async function updateLeadNoteAction(
  leadId: string,
  noteId: string,
  content: string,
): Promise<LeadNoteMutationState> {
  if (!isLeadActionId(leadId) || !isLeadActionId(noteId)) {
    return {
      success: false,
      message: "This note could not be found.",
    };
  }

  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();
  const parsed = leadNoteSchema.safeParse({ content });

  const permissionError = crmUpdatePermissionError(workspace.role);
  if (permissionError) return { success: false, message: permissionError };

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
    };
  }

  if (isDemoWorkspace(workspace)) {
    return {
      success: false,
      message: DEMO_MUTATION_MESSAGE,
    };
  }

  if (!parsed.success) {
    return {
      success: false,
      message: "Please review your note and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const [lead] = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
        assignedOwnerUserId: leads.assignedOwnerUserId,
      })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspace.id)))
      .limit(1);

    if (!lead) {
      return {
        success: false,
        message: "This lead could not be found.",
      };
    }

    if (!canAccessWorkspaceRecord(workspace, userId, lead.assignedOwnerUserId, "update")) {
      return { success: false, message: "This lead could not be found or you do not have permission to update it." };
    }

    const [existingNote] = await db
      .select({ id: leadNotes.id, userId: leadNotes.userId })
      .from(leadNotes)
      .where(
        and(
          eq(leadNotes.id, noteId),
          eq(leadNotes.leadId, leadId),
          eq(leadNotes.workspaceId, workspace.id),
        ),
      )
      .limit(1);

    if (!existingNote || !canAccessWorkspaceRecord(workspace, userId, existingNote.userId, "update")) {
      return { success: false, message: "This note could not be found or you do not have permission to update it." };
    }

    const updatedNote = await db.transaction(async (tx) => {
      const [note] = await tx
        .update(leadNotes)
        .set({
          content: parsed.data.content,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(leadNotes.id, noteId),
            eq(leadNotes.leadId, leadId),
            eq(leadNotes.workspaceId, workspace.id),
          ),
        )
        .returning({ id: leadNotes.id });

      if (!note) return null;

      await createLeadActivity({
        client: tx,
        workspaceId: workspace.id,
        userId,
        eventType: "lead_note_updated",
        message: `Note updated for ${lead.fullName}`,
        leadId: lead.id,
        leadName: lead.fullName,
      });

      return note;
    });

    if (!updatedNote) {
      return {
        success: false,
        message: "This note could not be found.",
      };
    }

    revalidateLeadPaths(leadId);

    return {
      success: true,
      message: "Note updated.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn't update this note right now. Please try again.",
    };
  }
}


export async function deleteLeadNoteAction(
  leadId: string,
  noteId: string,
): Promise<LeadNoteMutationState> {
  if (!isLeadActionId(leadId) || !isLeadActionId(noteId)) {
    return {
      success: false,
      message: "This note could not be found.",
    };
  }

  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();

  const permissionError = workspacePermissionError(workspace.role, "crm:delete");
  if (permissionError) return { success: false, message: permissionError };

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
    };
  }

  if (isDemoWorkspace(workspace)) {
    return {
      success: false,
      message: DEMO_MUTATION_MESSAGE,
    };
  }

  try {
    const requestId = await getRequestId();
    const [lead] = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
      })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspace.id)))
      .limit(1);

    if (!lead) {
      return {
        success: false,
        message: "This lead could not be found.",
      };
    }

    const deletedNote = await db.transaction(async (tx) => {
      const [note] = await tx
        .delete(leadNotes)
        .where(
          and(
            eq(leadNotes.id, noteId),
            eq(leadNotes.leadId, leadId),
            eq(leadNotes.workspaceId, workspace.id),
          ),
        )
        .returning({ id: leadNotes.id });

      if (!note) return null;

      await createLeadActivity({
        client: tx,
        workspaceId: workspace.id,
        userId,
        eventType: "lead_note_deleted",
        message: `Note removed from ${lead.fullName}`,
        leadId: lead.id,
        leadName: lead.fullName,
      });
      await writeAuditEvent({ tx, workspaceId: workspace.id, actor: { userId, role: workspace.role }, action: "note.deleted", entity: { type: "note", id: note.id }, before: { leadId }, requestId });

      return note;
    });

    if (!deletedNote) {
      return {
        success: false,
        message: "This note could not be found.",
      };
    }

    revalidateLeadPaths(leadId);

    return {
      success: true,
      message: "Note deleted.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn't delete this note right now. Please try again.",
    };
  }
}
