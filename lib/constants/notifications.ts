export const NOTIFICATION_TYPES = [
  "task_due",
  "task_overdue",
  "task_assigned",
  "lead_assigned",
  "deal_stage_changed",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  task_due: "Task due",
  task_overdue: "Task overdue",
  task_assigned: "Task assigned",
  lead_assigned: "Lead assigned",
  deal_stage_changed: "Deal stage updated",
};
