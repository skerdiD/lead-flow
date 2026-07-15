import Link from "next/link";
import { ArrowUpRight, CalendarClock, CircleCheckBig, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  formatTaskDueDate,
  getTaskPriorityLabel,
  getTaskStatusLabel,
  getTaskTimelineBucket,
  type TaskListItem,
  type TaskTimelineBucket,
} from "@/lib/tasks";
import { TaskStatusToggle } from "@/components/tasks/task-status-toggle";

export type TaskSectionConfig = {
  key: TaskTimelineBucket;
  title: string;
  description: string;
  emptyMessage: string;
  tasks: TaskListItem[];
};

type TaskSectionsProps = {
  sections: TaskSectionConfig[];
  compact?: boolean;
  showLeadContext?: boolean;
  showEmptySections?: boolean;
  globalEmptyTitle?: string;
  globalEmptyDescription?: string;
  readOnly?: boolean;
};

function getPriorityBadgeClass(priority: TaskListItem["priority"]) {
  switch (priority) {
    case "high":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "low":
    default:
      return "border-sky-200 bg-sky-50 text-sky-700";
  }
}

function getTimelineBadgeClass(bucket: TaskTimelineBucket) {
  switch (bucket) {
    case "overdue":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "dueToday":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "upcoming":
    default:
      return "border-sky-200 bg-sky-50 text-sky-700";
  }
}

function getTimelineLabel(bucket: TaskTimelineBucket, task: TaskListItem) {
  if (bucket === "completed") {
    return "Completed";
  }

  if (!task.dueAt) {
    return "No due date";
  }

  if (bucket === "overdue") {
    return "Overdue";
  }

  if (bucket === "dueToday") {
    return "Due today";
  }

  return "Upcoming";
}

function TaskRow({
  task,
  compact = false,
  showLeadContext = true,
  readOnly = false,
}: {
  task: TaskListItem;
  compact?: boolean;
  showLeadContext?: boolean;
  readOnly?: boolean;
}) {
  const timelineBucket = getTaskTimelineBucket(task);
  const isCompleted = timelineBucket === "completed";

  return (
    <article
      className={cn(
        "rounded-2xl border bg-background",
        compact ? "p-3" : "p-4",
      )}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{task.title}</p>
            <Badge
              variant="outline"
              className={cn("capitalize", getPriorityBadgeClass(task.priority))}
            >
              {getTaskPriorityLabel(task.priority)}
            </Badge>
            <Badge variant="outline">{getTaskStatusLabel(task.status)}</Badge>
            <Badge
              variant="outline"
              className={getTimelineBadgeClass(timelineBucket)}
            >
              {getTimelineLabel(timelineBucket, task)}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              {formatTaskDueDate(task.dueAt)}
            </span>
            {showLeadContext && task.leadId && task.leadName ? (
              <Link
                href={`/dashboard/leads/${task.leadId}`}
                className="inline-flex min-w-0 items-center gap-1.5 hover:text-foreground"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span className="truncate">
                  {task.leadName}
                  {task.leadCompany ? ` · ${task.leadCompany}` : ""}
                </span>
              </Link>
            ) : null}
          </div>

          {!compact && task.description ? (
            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
              {task.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          {!readOnly ? (
            <TaskStatusToggle
              taskId={task.id}
              completed={isCompleted}
              compact={compact}
            />
          ) : null}

          {task.leadId ? (
            <Button asChild variant="ghost" size={compact ? "xs" : "sm"}>
              <Link href={`/dashboard/leads/${task.leadId}`}>Open lead</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function TaskSections({
  sections,
  compact = false,
  showLeadContext = true,
  showEmptySections = true,
  globalEmptyTitle = "You are caught up",
  globalEmptyDescription = "No tasks need attention right now.",
  readOnly = false,
}: TaskSectionsProps) {
  const hasTasks = sections.some((section) => section.tasks.length > 0);
  const visibleSections = showEmptySections
    ? sections
    : sections.filter((section) => section.tasks.length > 0);

  if (!hasTasks && !showEmptySections) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-8 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border bg-background">
          <CircleCheckBig className="h-5 w-5 text-emerald-600" />
        </div>
        <p className="mt-4 text-sm font-semibold text-foreground">{globalEmptyTitle}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {globalEmptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visibleSections.map((section) => (
        <section key={section.key} className="rounded-2xl border bg-muted/15 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  {section.title}
                </p>
                <Badge variant="outline">{section.tasks.length}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {section.description}
              </p>
            </div>
          </div>

          {section.tasks.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed bg-background/70 px-4 py-6 text-center text-sm text-muted-foreground">
              {section.emptyMessage}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {section.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  compact={compact}
                  showLeadContext={showLeadContext}
                  readOnly={readOnly}
                />
              ))}
            </div>
          )}
        </section>
      ))}

      {!hasTasks && showEmptySections ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border bg-background">
            <Clock3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm font-semibold text-foreground">{globalEmptyTitle}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {globalEmptyDescription}
          </p>
        </div>
      ) : null}
    </div>
  );
}
