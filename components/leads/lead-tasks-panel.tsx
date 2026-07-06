"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createFollowUpTaskAction } from "@/app/dashboard/leads/actions";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  type TaskPriority,
} from "@/lib/constants/crm";
import { groupTasksByTimeline, type LegacyTaskStatus } from "@/lib/tasks";
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
import { TaskSections } from "@/components/tasks/task-sections";
import { Textarea } from "@/components/ui/textarea";

type LeadTask = {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date | null;
  status: LegacyTaskStatus;
  priority: TaskPriority;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt?: Date | null;
  leadId?: string | null;
  leadName?: string | null;
  leadCompany?: string | null;
};

type LeadTasksPanelProps = {
  leadId: string;
  tasks: LeadTask[];
};

export function LeadTasksPanel({ leadId, tasks }: LeadTasksPanelProps) {
  const router = useRouter();
  const [isCreating, startCreateTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const groupedTasks = groupTasksByTimeline(
    tasks.map((task) => ({
      ...task,
      leadId,
      leadName: null,
      leadCompany: null,
      updatedAt: task.updatedAt ?? task.createdAt,
    })),
  );

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

  return (
    <section id="lead-tasks" className="rounded-3xl border bg-background p-6 shadow-sm">
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
        <TaskSections
          sections={[
            {
              key: "overdue",
              title: "Overdue",
              description: "Tasks that slipped and need a fresh follow-through.",
              emptyMessage: "No overdue tasks",
              tasks: groupedTasks.overdue,
            },
            {
              key: "dueToday",
              title: "Due today",
              description: "Tasks that should move this lead forward today.",
              emptyMessage: "No tasks due today",
              tasks: groupedTasks.dueToday,
            },
            {
              key: "upcoming",
              title: "Upcoming",
              description: "Next planned tasks already tied to this lead.",
              emptyMessage: "No upcoming tasks",
              tasks: groupedTasks.upcoming,
            },
            {
              key: "completed",
              title: "Completed",
              description: "Closed-out tasks that can be reopened if needed.",
              emptyMessage: "No completed tasks yet",
              tasks: groupedTasks.completed,
            },
          ]}
          showLeadContext={false}
          showEmptySections={tasks.length > 0}
          globalEmptyTitle="No follow-up tasks yet"
          globalEmptyDescription="Add the next action for this lead so nothing slips through the cracks."
        />
      </div>
    </section>
  );
}
