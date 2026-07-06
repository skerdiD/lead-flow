import { describe, expect, it } from "vitest";
import {
  formatTaskDueDate,
  getTaskTimelineBucket,
  groupTasksByTimeline,
  normalizeTaskStatus,
  type TaskListItem,
} from "@/lib/tasks";

const baseTask: TaskListItem = {
  id: "task_1",
  title: "Send proposal",
  description: null,
  dueAt: null,
  status: "pending",
  priority: "medium",
  completedAt: null,
  createdAt: new Date("2026-07-05T10:00:00.000Z"),
  updatedAt: new Date("2026-07-05T10:00:00.000Z"),
  leadId: "lead_1",
  leadName: "Jane Doe",
  leadCompany: "Acme",
};

describe("task helpers", () => {
  it("normalizes legacy statuses", () => {
    expect(normalizeTaskStatus("done")).toBe("completed");
    expect(normalizeTaskStatus("overdue")).toBe("pending");
    expect(normalizeTaskStatus("pending")).toBe("pending");
  });

  it("classifies tasks into timeline buckets using stored due dates", () => {
    const todayKey = "2026-07-06";

    expect(
      getTaskTimelineBucket(
        {
          ...baseTask,
          dueAt: new Date("2026-07-06T23:59:59.999Z"),
        },
        todayKey,
      ),
    ).toBe("dueToday");

    expect(
      getTaskTimelineBucket(
        {
          ...baseTask,
          dueAt: new Date("2026-07-05T23:59:59.999Z"),
        },
        todayKey,
      ),
    ).toBe("overdue");

    expect(
      getTaskTimelineBucket(
        {
          ...baseTask,
          dueAt: new Date("2026-07-09T23:59:59.999Z"),
        },
        todayKey,
      ),
    ).toBe("upcoming");

    expect(
      getTaskTimelineBucket(
        {
          ...baseTask,
          status: "completed",
          completedAt: new Date("2026-07-06T09:00:00.000Z"),
        },
        todayKey,
      ),
    ).toBe("completed");
  });

  it("groups tasks by timeline in a stable display order", () => {
    const grouped = groupTasksByTimeline(
      [
        {
          ...baseTask,
          id: "task_upcoming",
          dueAt: new Date("2026-07-09T23:59:59.999Z"),
          priority: "low",
        },
        {
          ...baseTask,
          id: "task_due_today",
          dueAt: new Date("2026-07-06T23:59:59.999Z"),
          priority: "high",
        },
        {
          ...baseTask,
          id: "task_completed",
          status: "completed",
          completedAt: new Date("2026-07-06T10:00:00.000Z"),
        },
        {
          ...baseTask,
          id: "task_overdue",
          dueAt: new Date("2026-07-04T23:59:59.999Z"),
          priority: "medium",
        },
      ],
      "2026-07-06",
    );

    expect(grouped.dueToday.map((task) => task.id)).toEqual(["task_due_today"]);
    expect(grouped.overdue.map((task) => task.id)).toEqual(["task_overdue"]);
    expect(grouped.upcoming.map((task) => task.id)).toEqual(["task_upcoming"]);
    expect(grouped.completed.map((task) => task.id)).toEqual(["task_completed"]);
  });

  it("formats task dates without shifting the saved due day", () => {
    expect(formatTaskDueDate(new Date("2026-07-06T23:59:59.999Z"))).toBe(
      "06 Jul 2026",
    );
  });
});
