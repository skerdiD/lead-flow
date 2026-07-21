import { CheckCircle2, Clock3, ListTodo, TimerReset } from "lucide-react";
import { getTasksPageData } from "@/app/dashboard/tasks/queries";
import { DemoReadOnlyHint } from "@/components/demo/demo-read-only-hint";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { TaskSections } from "@/components/tasks/task-sections";
import { TaskFilters } from "@/components/tasks/task-filters";
import { isDemoWorkspace } from "@/lib/demo";
import { getTaskCountSummary } from "@/lib/tasks";
import { getCurrentWorkspace } from "@/lib/workspaces";
import { hasWorkspacePermission } from "@/lib/authorization";

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const [taskData, workspace] = await Promise.all([
    getTasksPageData(params),
    getCurrentWorkspace(),
  ]);
  const readOnly = isDemoWorkspace(workspace);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tasks"
        description="Manage your follow-ups and upcoming tasks."
        compact
      />

      {readOnly ? <DemoReadOnlyHint /> : null}

      <TaskFilters {...taskData.filters} />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Due today"
          value={taskData.counts.dueToday}
          icon={Clock3}
          tone="warning"
          helper={getTaskCountSummary("dueToday", taskData.counts.dueToday)}
          compact
        />
        <StatCard
          title="Overdue"
          value={taskData.counts.overdue}
          icon={TimerReset}
          tone="warning"
          helper={getTaskCountSummary("overdue", taskData.counts.overdue)}
          compact
        />
        <StatCard
          title="Upcoming"
          value={taskData.counts.upcoming}
          icon={ListTodo}
          tone="info"
          helper={getTaskCountSummary("upcoming", taskData.counts.upcoming)}
          compact
        />
        <StatCard
          title="Completed"
          value={taskData.counts.completed}
          icon={CheckCircle2}
          tone="positive"
          helper={getTaskCountSummary("completed", taskData.counts.completed)}
          compact
        />
      </section>

      {Object.values(taskData.counts).every((count) => count === 0) && Object.values(taskData.filters).some(Boolean) ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-12 text-center"><h2 className="font-semibold">No results match your search.</h2><p className="mt-2 text-sm text-muted-foreground">Try another search or clear your filters.</p></div>
      ) : <TaskSections
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
        canDelete={hasWorkspacePermission(workspace.role, "crm:delete")}
      />}
    </div>
  );
}
