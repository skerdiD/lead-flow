import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/constants/crm";

export type LegacyTaskStatus = TaskStatus | "done" | "overdue";
export type TaskTimelineBucket = "dueToday" | "overdue" | "upcoming" | "completed";

export type TaskListItem = {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date | null;
  status: LegacyTaskStatus;
  priority: TaskPriority;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  leadId: string | null;
  leadName: string | null;
  leadCompany: string | null;
};

export type GroupedTasks = Record<TaskTimelineBucket, TaskListItem[]>;
export type TaskCountSummaryKind = TaskTimelineBucket;

export const TASK_BUCKET_LABELS: Record<TaskTimelineBucket, string> = {
  dueToday: "Due today",
  overdue: "Overdue",
  upcoming: "Upcoming",
  completed: "Completed",
};

export function normalizeTaskStatus(status: LegacyTaskStatus): TaskStatus {
  if (status === "done") return "completed";
  if (status === "overdue") return "pending";
  return status;
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getStoredTaskDateKey(date: Date | null) {
  if (!date) return null;

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getTaskTimelineBucket(
  task: Pick<TaskListItem, "completedAt" | "dueAt" | "status">,
  todayKey = getLocalDateKey(),
): TaskTimelineBucket {
  const normalizedStatus = normalizeTaskStatus(task.status);

  if (normalizedStatus === "completed" || task.completedAt) {
    return "completed";
  }

  const dueDateKey = getStoredTaskDateKey(task.dueAt);

  if (!dueDateKey) {
    return "upcoming";
  }

  if (dueDateKey < todayKey) {
    return "overdue";
  }

  if (dueDateKey === todayKey) {
    return "dueToday";
  }

  return "upcoming";
}

function priorityWeight(priority: TaskPriority) {
  switch (priority) {
    case "high":
      return 0;
    case "medium":
      return 1;
    case "low":
    default:
      return 2;
  }
}

function dueDateWeight(task: Pick<TaskListItem, "dueAt">) {
  return task.dueAt ? task.dueAt.getTime() : Number.MAX_SAFE_INTEGER;
}

export function sortTasksForDisplay(
  tasks: TaskListItem[],
  todayKey = getLocalDateKey(),
) {
  return [...tasks].sort((left, right) => {
    const leftBucket = getTaskTimelineBucket(left, todayKey);
    const rightBucket = getTaskTimelineBucket(right, todayKey);

    if (leftBucket === "completed" && rightBucket === "completed") {
      return (
        (right.completedAt?.getTime() ?? 0) - (left.completedAt?.getTime() ?? 0)
      );
    }

    const dueDifference = dueDateWeight(left) - dueDateWeight(right);

    if (dueDifference !== 0) {
      return dueDifference;
    }

    const priorityDifference =
      priorityWeight(left.priority) - priorityWeight(right.priority);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  });
}

export function groupTasksByTimeline(
  tasks: TaskListItem[],
  todayKey = getLocalDateKey(),
): GroupedTasks {
  const grouped: GroupedTasks = {
    dueToday: [],
    overdue: [],
    upcoming: [],
    completed: [],
  };

  for (const task of sortTasksForDisplay(tasks, todayKey)) {
    grouped[getTaskTimelineBucket(task, todayKey)].push(task);
  }

  return grouped;
}

const TASK_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatTaskDueDate(date: Date | null) {
  if (!date) return "No due date";

  return TASK_DATE_FORMATTER.format(date);
}

export function getTaskPriorityLabel(priority: TaskPriority) {
  return TASK_PRIORITY_LABELS[priority];
}

export function getTaskCountSummary(
  kind: TaskCountSummaryKind,
  count: number,
) {
  const taskLabel = `${count} task${count === 1 ? "" : "s"}`;

  switch (kind) {
    case "dueToday":
      return count === 0 ? "No tasks due today" : `${taskLabel} due today`;
    case "overdue":
      return count === 0
        ? "No overdue tasks"
        : `${taskLabel} need${count === 1 ? "s" : ""} attention`;
    case "upcoming":
      return count === 0 ? "No upcoming tasks" : `${taskLabel} planned next`;
    case "completed":
      return count === 0
        ? "No tasks completed recently"
        : `${taskLabel} completed recently`;
  }
}

export function getTaskStatusLabel(status: LegacyTaskStatus) {
  return TASK_STATUS_LABELS[normalizeTaskStatus(status)];
}
