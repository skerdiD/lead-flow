export function parseTaskDueAt(value?: string) {
  if (!value) return null;

  const dueAt = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(dueAt.getTime()) ? null : dueAt;
}

export function getInitialTaskStatus(dueAt: Date | null) {
  void dueAt;
  return "pending" as const;
}
