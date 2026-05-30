"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  completeFollowUpTaskAction,
  createFollowUpTaskAction,
} from "@/app/dashboard/leads/actions";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/constants/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type LeadTask = {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date | null;
  status: TaskStatus;
  priority: TaskPriority;
  completedAt: Date | null;
  createdAt: Date;
};

type LeadTasksPanelProps = {
  leadId: string;
  tasks: LeadTask[];
};

function formatDate(date: Date | null) {
  if (!date) return "No due date";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getDisplayStatus(task: LeadTask) {
  if (task.status === "done") return "done";
  if (task.dueAt && task.dueAt.getTime() < Date.now()) return "overdue";
  return task.status;
}

function statusLabel(status: TaskStatus) {
  switch (status) {
    case "done":
      return "Done";
    case "overdue":
      return "Overdue";
    case "pending":
    default:
      return "Pending";
  }
}

export function LeadTasksPanel({ leadId, tasks }: LeadTasksPanelProps) {
  const router = useRouter();
  const [isCreating, startCreateTransition] = useTransition();
  const [isCompleting, startCompleteTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");

  const handleCreateTask = () => {
    startCreateTransition(async () => {
      const result = await createFollowUpTaskAction(leadId, {
        title,
        description,
        dueDate,
        priority,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority("medium");
      toast.success(result.message);
      router.refresh();
    });
  };

  const handleCompleteTask = (taskId: string) => {
    startCompleteTransition(async () => {
      const result = await completeFollowUpTaskAction(leadId, taskId);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <section className="rounded-3xl border bg-background p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">
            Follow-up tasks
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan the next action and close the loop when it is done.
          </p>
        </div>
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="mt-5 grid gap-4 rounded-2xl border bg-muted/20 p-4 lg:grid-cols-[1fr_180px_150px_auto]">
        <div className="space-y-2 lg:col-span-4">
          <Label htmlFor="task-title">Title</Label>
          <Input
            id="task-title"
            placeholder="Follow up after proposal review"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isCreating}
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="task-description">Description</Label>
          <Textarea
            id="task-description"
            className="min-h-20 resize-y"
            placeholder="Add any context needed for the follow-up."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isCreating}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-due-date">Due date</Label>
          <Input
            id="task-due-date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            disabled={isCreating}
          />
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={priority}
            onValueChange={(value) => setPriority(value as TaskPriority)}
            disabled={isCreating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {TASK_PRIORITY_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button
            type="button"
            className="w-full"
            onClick={handleCreateTask}
            disabled={isCreating || title.trim().length < 2}
          >
            {isCreating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add task
          </Button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            No follow-up tasks yet.
          </div>
        ) : (
          tasks.map((task) => {
            const displayStatus = getDisplayStatus(task);
            const isDone = displayStatus === "done";

            return (
              <article key={task.id} className="rounded-2xl border bg-background p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{task.title}</p>
                      <span className="rounded-full border bg-muted/20 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        {statusLabel(displayStatus)}
                      </span>
                      <span className="rounded-full border bg-muted/20 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        {TASK_PRIORITY_LABELS[task.priority]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Due {formatDate(task.dueAt)}
                    </p>
                    {task.description ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                        {task.description}
                      </p>
                    ) : null}
                  </div>

                  {!isDone ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={isCompleting}
                    >
                      {isCompleting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Done
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
