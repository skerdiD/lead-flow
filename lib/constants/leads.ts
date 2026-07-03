export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Interested",
  "Proposal Sent",
  "Closed",
  "Lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const FOLLOW_UP_PRIORITIES = ["low", "medium", "high"] as const;
export type FollowUpPriority = (typeof FOLLOW_UP_PRIORITIES)[number];

export const FOLLOW_UP_PRIORITY_LABELS: Record<FollowUpPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const FOLLOW_UP_STATUSES = [
  "pending",
  "completed",
  "rescheduled",
] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const FOLLOW_UP_STATUS_LABELS: Record<FollowUpStatus, string> = {
  pending: "Pending",
  completed: "Completed",
  rescheduled: "Rescheduled",
};
