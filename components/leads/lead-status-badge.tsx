import { Badge } from "@/components/ui/badge";
import type { LeadStatus } from "@/lib/constants/leads";
import { cn } from "@/lib/utils";

const statusStyles: Record<LeadStatus, string> = {
  New: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50",
  Contacted: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-50",
  Interested: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50",
  "Proposal Sent": "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-50",
  Closed: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  Lost: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50",
};

type LeadStatusBadgeProps = {
  status: LeadStatus;
};

export function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
      )}
    >
      {status}
    </Badge>
  );
}