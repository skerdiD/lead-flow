import { CheckCircle2, Clock3, ListTodo, TimerReset } from "lucide-react";
import { getTasksPageData } from "@/app/dashboard/tasks/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { TaskSections } from "@/components/tasks/task-sections";

export default async function TasksPage() {
  const taskData = await getTasksPageData();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Daily execution"
        title="Tasks"
        description="A clean view of the follow-ups and CRM tasks that need action today, later, or next."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Due Today"
          value={taskData.counts.dueToday}
          description="Tasks that should be handled before the day ends."
          icon={Clock3}
          tone="warning"
          helper="today"
        />
        <StatCard
          title="Overdue"
          value={taskData.counts.overdue}
          description="Tasks that are already past their due date."
          icon={TimerReset}
          tone="warning"
          helper="needs attention"
        />
        <StatCard
          title="Upcoming"
          value={taskData.counts.upcoming}
          description="Scheduled work that is coming up next."
          icon={ListTodo}
          tone="info"
          helper="planned next"
        />
        <StatCard
          title="Completed"
          value={taskData.counts.completed}
          description="Tasks you have already closed out."
          icon={CheckCircle2}
          tone="positive"
          helper="done recently"
        />
      </section>

      <TaskSections
        sections={[
          {
            key: "dueToday",
            title: "Due today",
            description: "Tasks that should be wrapped up before the end of today.",
            emptyMessage: "No tasks due today",
            tasks: taskData.groupedTasks.dueToday,
          },
          {
            key: "overdue",
            title: "Overdue",
            description: "Work that needs immediate follow-through or a new plan.",
            emptyMessage: "No overdue tasks",
            tasks: taskData.groupedTasks.overdue,
          },
          {
            key: "upcoming",
            title: "Upcoming",
            description: "The next scheduled tasks across your active leads.",
            emptyMessage: "No upcoming tasks",
            tasks: taskData.groupedTasks.upcoming,
          },
          {
            key: "completed",
            title: "Completed",
            description: "Recently completed tasks that you can reopen if needed.",
            emptyMessage: "No completed tasks yet",
            tasks: taskData.groupedTasks.completed,
          },
        ]}
        globalEmptyTitle="You are caught up"
        globalEmptyDescription="Nothing is due, overdue, or waiting in your task list right now."
      />
    </div>
  );
}
