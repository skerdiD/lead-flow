import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FOLLOW_UP_PRIORITY_LABELS,
  FOLLOW_UP_STATUS_LABELS,
  type FollowUpPriority,
  type FollowUpStatus,
} from "@/lib/constants/leads";

type LeadFollowUpBadgeProps = {
  date: string | Date | null;
  note?: string | null;
  priority: FollowUpPriority;
  status: FollowUpStatus;
  compact?: boolean;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDateState(dateValue: string | Date | null) {
  if (!dateValue) return "none";

  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  if (Number.isNaN(date.getTime())) return "none";

  const today = startOfLocalDay(new Date()).getTime();
  const followUpDay = startOfLocalDay(date).getTime();

  if (followUpDay < today) return "overdue";
  if (followUpDay === today) return "today";
  return "upcoming";
}

function formatDate(dateValue: string | Date | null) {
  if (!dateValue) return "";
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  return Number.isNaN(date.getTime()) ? "" : DATE_FORMATTER.format(date);
}

export function LeadFollowUpBadge({
  date,
  note,
  priority,
  status,
  compact = false,
}: LeadFollowUpBadgeProps) {
  const dateState = getDateState(date);
  const displayDate = formatDate(date);

  if (status === "completed") {
    return (
      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
        Completed
      </Badge>
    );
  }

  if (dateState === "none") {
    return (
      <span className="text-sm text-muted-foreground">
        No follow-up set
      </span>
    );
  }

  const label =
    dateState === "overdue"
      ? "Overdue"
      : dateState === "today"
        ? "Due today"
        : displayDate;

  return (
    <div className={cn("min-w-0", compact ? "space-y-1" : "space-y-2")}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className={cn(
            "gap-1.5",
            dateState === "overdue" && "border-rose-200 bg-rose-50 text-rose-700",
            dateState === "today" && "border-amber-200 bg-amber-50 text-amber-700",
            dateState === "upcoming" && "border-sky-200 bg-sky-50 text-sky-700",
          )}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {label}
        </Badge>
        {status === "rescheduled" ? (
          <Badge variant="secondary">Rescheduled</Badge>
        ) : null}
      </div>

      {!compact ? (
        <p className="text-xs leading-5 text-muted-foreground">
          {FOLLOW_UP_PRIORITY_LABELS[priority]} priority
          {status !== "pending" ? ` - ${FOLLOW_UP_STATUS_LABELS[status]}` : ""}
          {note?.trim() ? ` - ${note.trim()}` : ""}
        </p>
      ) : null}
    </div>
  );
}
