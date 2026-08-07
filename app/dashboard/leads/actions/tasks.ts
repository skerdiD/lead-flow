"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { crmTasks, deals, leads } from "@/db/schema";
import { hasWorkspacePermission } from "@/lib/authorization";
import { requireUserId } from "@/lib/auth";
import { DEMO_MUTATION_MESSAGE, isDemoWorkspace } from "@/lib/demo";
import { createNotificationBestEffort } from "@/lib/notifications";
import { getLocalDateKey, getTaskTimelineBucket } from "@/lib/tasks";
import {
  crmTaskFormSchema,
  type CrmTaskFormValues,
} from "@/lib/validations/crm-task";
import { getCurrentWorkspace } from "@/lib/workspaces";
import { createLeadActivity } from "../services/activity-service";
import {
  getInitialTaskStatus,
  parseTaskDueAt,
} from "../services/task-service";
import {
  canAccessWorkspaceRecord,
  crmUpdatePermissionError,
  ensureLeadMutationAllowed,
  revalidateLeadPaths,
  workspacePermissionError,
} from "./shared";
import type { CrmTaskMutationState } from "./types";
import { isLeadActionId } from "../validations/action-inputs";

export async function createFollowUpTaskAction(
  leadId: string,
  input: CrmTaskFormValues,
): Promise<CrmTaskMutationState> {
  if (!isLeadActionId(leadId)) {
    return {
      success: false,
      message: "This lead could not be found.",
    };
  }

  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed("task:create");
  const parsed = crmTaskFormSchema.safeParse(input);

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
      message: "Please review the task and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const [lead] = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
        primaryContactId: leads.primaryContactId,
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

    const [leadDeal] = await db
      .select({ id: deals.id })
      .from(deals)
      .where(and(eq(deals.leadId, leadId), eq(deals.workspaceId, workspace.id)))
      .limit(1);

    const dueAt = parseTaskDueAt(parsed.data.dueDate);

    const notificationPlan = await db.transaction(async (tx) => {
      const [task] = await tx
        .insert(crmTasks)
        .values({
          workspaceId: workspace.id,
          userId,
          ownerUserId: hasWorkspacePermission(workspace.role, "crm:assign")
            ? lead.assignedOwnerUserId ?? userId
            : userId,
          leadId,
          dealId: leadDeal?.id ?? null,
          contactId: lead.primaryContactId,
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          dueAt,
          status: getInitialTaskStatus(dueAt),
          priority: parsed.data.priority,
        })
        .returning({ id: crmTasks.id });

      const notificationUserId = hasWorkspacePermission(workspace.role, "crm:assign")
        ? lead.assignedOwnerUserId ?? userId
        : userId;
      if (!task) throw new Error("Task creation did not return a record.");

      await createLeadActivity({
        client: tx,
        workspaceId: workspace.id,
        userId,
        eventType: "task_created",
        message: `Task created for ${lead.fullName}: ${parsed.data.title}`,
        leadId,
        leadName: lead.fullName,
      });

      return notificationUserId === userId
        ? null
        : { notificationUserId, taskId: task.id, leadName: lead.fullName, dueAt };
    });

    if (notificationPlan) {
      const actionUrl = `/dashboard/leads/${leadId}#lead-tasks`;
      const metadata = { entityType: "task", entityId: notificationPlan.taskId };
      await createNotificationBestEffort({
        workspaceId: workspace.id,
        userId: notificationPlan.notificationUserId,
        type: "task_assigned",
        title: "Task assigned",
        message: `${parsed.data.title} was assigned to you for ${notificationPlan.leadName}.`,
        actionUrl,
        metadata,
        dedupeKey: `task-assigned:${notificationPlan.taskId}`,
      }, { operation: "task.assignment.notification", entityType: "task", entityId: notificationPlan.taskId });

      const taskBucket = getTaskTimelineBucket(
        { dueAt: notificationPlan.dueAt, status: "pending", completedAt: null },
        getLocalDateKey(),
      );
      const dueNotificationType = taskBucket === "overdue" ? "task_overdue" : taskBucket === "dueToday" ? "task_due" : null;
      if (dueNotificationType) {
        await createNotificationBestEffort({
          workspaceId: workspace.id,
          userId: notificationPlan.notificationUserId,
          type: dueNotificationType,
          title: dueNotificationType === "task_overdue" ? "Task overdue" : "Task due today",
          message: dueNotificationType === "task_overdue" ? `${parsed.data.title} is already past its due date.` : `${parsed.data.title} is due today.`,
          actionUrl,
          metadata,
          dedupeKey: `${dueNotificationType}:${notificationPlan.taskId}`,
        }, { operation: "task.due.notification", entityType: "task", entityId: notificationPlan.taskId });
      }
    }

    revalidateLeadPaths(leadId);

    return {
      success: true,
      message: "Follow-up task created.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn't create this task right now. Please try again.",
    };
  }
}


export async function completeFollowUpTaskAction(
  leadId: string,
  taskId: string,
): Promise<CrmTaskMutationState> {
  if (!isLeadActionId(leadId) || !isLeadActionId(taskId)) {
    return {
      success: false,
      message: "This task could not be found.",
    };
  }

  const userId = await requireUserId();
  const workspace = await getCurrentWorkspace();
  const protection = await ensureLeadMutationAllowed();

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

    const [task] = await db
      .select({
        id: crmTasks.id,
        title: crmTasks.title,
        status: crmTasks.status,
        ownerUserId: crmTasks.ownerUserId,
        userId: crmTasks.userId,
      })
      .from(crmTasks)
      .where(
        and(
          eq(crmTasks.id, taskId),
          eq(crmTasks.leadId, leadId),
          eq(crmTasks.workspaceId, workspace.id),
        ),
      )
      .limit(1);

    if (!task) {
      return {
        success: false,
        message: "This task could not be found.",
      };
    }

    if (!canAccessWorkspaceRecord(workspace, userId, task.ownerUserId ?? task.userId, "update")) {
      return { success: false, message: "This task could not be found or you do not have permission to update it." };
    }

    if (task.status === "completed") {
      return {
        success: true,
        message: "Task is already completed.",
      };
    }

    const completedTask = await db.transaction(async (tx) => {
      const [completed] = await tx
        .update(crmTasks)
        .set({
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(crmTasks.id, taskId),
            eq(crmTasks.leadId, leadId),
            eq(crmTasks.workspaceId, workspace.id),
          ),
        )
        .returning({
          id: crmTasks.id,
          title: crmTasks.title,
        });

      if (!completed) return null;

      await createLeadActivity({
        client: tx,
        workspaceId: workspace.id,
        userId,
        eventType: "task_completed",
        message: `Task completed for ${lead.fullName}: ${completed.title}`,
        leadId,
        leadName: lead.fullName,
      });

      return completed;
    });

    if (!completedTask) {
      return {
        success: false,
        message: "This task could not be found.",
      };
    }

    revalidateLeadPaths(leadId);

    return {
      success: true,
      message: "Task marked complete.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn't complete this task right now. Please try again.",
    };
  }
}
