import { CheckCircle2, Clock3, ListTodo, TimerReset } from "lucide-react";
import { getTasksPageData } from "@/app/dashboard/tasks/queries";
import { DemoReadOnlyHint } from "@/components/demo/demo-read-only-hint";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { TaskSections } from "@/components/tasks/task-sections";
import { isDemoWorkspace } from "@/lib/demo";
import { getCurrentWorkspace } from "@/lib/workspaces";

export default async function TasksPage() {
  const [taskData, workspace] = await Promise.all([
    getTasksPageData(),
    getCurrentWorkspace(),
  ]);
  const readOnly = isDemoWorkspace(workspace);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Daily execution"
        title="Tasks"
        description="Manage your follow-ups and upcoming tasks."
      />

      {readOnly ? <DemoReadOnlyHint /> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Due today"
          value={taskData.counts.dueToday}
          icon={Clock3}
          tone="warning"
        />
        <StatCard
          title="Overdue"
          value={taskData.counts.overdue}
          icon={TimerReset}
          tone="warning"
        />
        <StatCard
          title="Upcoming"
          value={taskData.counts.upcoming}
          icon={ListTodo}
          tone="info"
        />
        <StatCard
          title="Completed"
          value={taskData.counts.completed}
          icon={CheckCircle2}
          tone="positive"
        />
      </section>

      <TaskSections
        sections={[
          {
            key: "dueToday",
            title: "Due today",
            description: "Tasks due by the end of today.",
            emptyMessage: "No tasks due today",
            tasks: taskData.groupedTasks.dueToday,
          },
          {
            key: "overdue",
            title: "Overdue",
            description: "Past-due tasks that need attention.",
            emptyMessage: "No overdue tasks",
            tasks: taskData.groupedTasks.overdue,
          },
          {
            key: "upcoming",
            title: "Upcoming",
            description: "Tasks scheduled for the next few days.",
            emptyMessage: "No upcoming tasks",
            tasks: taskData.groupedTasks.upcoming,
          },
          {
            key: "completed",
            title: "Completed",
            description: "Recently completed tasks.",
            emptyMessage: "No completed tasks yet",
            tasks: taskData.groupedTasks.completed,
          },
        ]}
        globalEmptyTitle="You are caught up"
        globalEmptyDescription="No tasks need your attention right now."
        readOnly={readOnly}
      />
    </div>
  );
}
