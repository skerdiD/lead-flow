"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { activityEvents, crmTasks, leads } from "@/db/schema";
import { protectLeadMutation } from "@/lib/arcjet";
import {
  hasWorkspacePermission,
  permissionDeniedMessage,
} from "@/lib/authorization";
import { requireUserId } from "@/lib/auth";
import { DEMO_MUTATION_MESSAGE, isDemoWorkspace } from "@/lib/demo";
import { getCurrentWorkspace } from "@/lib/workspaces";

export type TaskMutationState =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message: string;
    };

function revalidateTaskPaths(leadId: string | null) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/activity");

  if (leadId) {
    revalidatePath(`/dashboard/leads/${leadId}`);
    revalidatePath(`/dashboard/leads/${leadId}/edit`);
  }
}

async function createTaskActivity(params: {
  workspaceId: string;
  userId: string;
  leadId: string | null;
  leadName: string | null;
  message: string;
}) {
  try {
    await db.insert(activityEvents).values({
      workspaceId: params.workspaceId,
      userId: params.userId,
      eventType: "task_completed",
      message: params.message,
      leadId: params.leadId,
      leadName: params.leadName,
    });
  } catch {
    // Activity logging should not block task updates.
  }
}

export async function completeTaskAction(taskId: string): Promise<TaskMutationState> {
  const [userId, workspace, protection] = await Promise.all([
    requireUserId(),
    getCurrentWorkspace(),
    protectLeadMutation(),
  ]);

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
    };
  }

  if (!hasWorkspacePermission(workspace.role, "crm:update")) {
    return {
      success: false,
      message: permissionDeniedMessage("crm:update"),
    };
  }

  if (isDemoWorkspace(workspace)) {
    return {
      success: false,
      message: DEMO_MUTATION_MESSAGE,
    };
  }

  try {
    const [task] = await db
      .select({
        id: crmTasks.id,
        title: crmTasks.title,
        status: crmTasks.status,
        leadId: crmTasks.leadId,
        leadName: leads.fullName,
      })
      .from(crmTasks)
      .leftJoin(
        leads,
        and(eq(crmTasks.leadId, leads.id), eq(leads.workspaceId, workspace.id)),
      )
      .where(
        and(
          eq(crmTasks.id, taskId),
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

    if (task.status === "completed") {
      return {
        success: true,
        message: "Task is already completed.",
      };
    }

    const [completedTask] = await db
      .update(crmTasks)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(crmTasks.id, taskId),
          eq(crmTasks.workspaceId, workspace.id),
        ),
      )
      .returning({
        id: crmTasks.id,
      });

    if (!completedTask) {
      return {
        success: false,
        message: "This task could not be found.",
      };
    }

    await createTaskActivity({
      workspaceId: workspace.id,
      userId,
      leadId: task.leadId,
      leadName: task.leadName,
      message: task.leadName
        ? `Task completed for ${task.leadName}: ${task.title}`
        : `Task completed: ${task.title}`,
    });

    revalidateTaskPaths(task.leadId);

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

export async function reopenTaskAction(taskId: string): Promise<TaskMutationState> {
  const [workspace, protection] = await Promise.all([
    getCurrentWorkspace(),
    protectLeadMutation(),
  ]);

  if (!protection.ok) {
    return {
      success: false,
      message: protection.message,
    };
  }

  if (!hasWorkspacePermission(workspace.role, "crm:update")) {
    return {
      success: false,
      message: permissionDeniedMessage("crm:update"),
    };
  }

  if (isDemoWorkspace(workspace)) {
    return {
      success: false,
      message: DEMO_MUTATION_MESSAGE,
    };
  }

  try {
    const [task] = await db
      .select({
        id: crmTasks.id,
        leadId: crmTasks.leadId,
      })
      .from(crmTasks)
      .where(
        and(
          eq(crmTasks.id, taskId),
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

    const [reopenedTask] = await db
      .update(crmTasks)
      .set({
        status: "pending",
        completedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(crmTasks.id, taskId),
          eq(crmTasks.workspaceId, workspace.id),
        ),
      )
      .returning({
        id: crmTasks.id,
      });

    if (!reopenedTask) {
      return {
        success: false,
        message: "This task could not be found.",
      };
    }

    revalidateTaskPaths(task.leadId);

    return {
      success: true,
      message: "Task reopened.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn't reopen this task right now. Please try again.",
    };
  }
}
