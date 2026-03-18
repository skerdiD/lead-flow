import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ActivityFeedItem } from "@/app/dashboard/activity/queries";
import { Badge } from "@/components/ui/badge";

type ActivityFeedProps = {
  items: ActivityFeedItem[];
};

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function eventTypeLabel(eventType: ActivityFeedItem["eventType"]) {
  switch (eventType) {
    case "lead_created":
      return "Lead created";
    case "lead_updated":
      return "Lead updated";
    case "lead_status_changed":
      return "Status changed";
    case "lead_deleted":
      return "Lead deleted";
    case "lead_note_added":
      return "Note added";
    case "lead_note_updated":
      return "Note updated";
    case "lead_note_deleted":
      return "Note deleted";
    default:
      return "Activity";
  }
}

function eventTypeVariant(
  eventType: ActivityFeedItem["eventType"],
): "default" | "secondary" | "outline" | "destructive" {
  switch (eventType) {
    case "lead_created":
      return "default";
    case "lead_status_changed":
      return "secondary";
    case "lead_note_added":
      return "secondary";
    case "lead_note_updated":
      return "outline";
    case "lead_note_deleted":
    case "lead_deleted":
      return "destructive";
    case "lead_updated":
    default:
      return "outline";
  }
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <section className="rounded-3xl border bg-background p-4 shadow-sm sm:p-6">
      <ol className="space-y-4">
        {items.map((item) => {
          const canOpenLead = item.leadId && item.eventType !== "lead_deleted";

          return (
            <li key={item.id} className="rounded-2xl border bg-background p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={eventTypeVariant(item.eventType)}>
                  {eventTypeLabel(item.eventType)}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(item.createdAt)}
                </p>
              </div>

              <p className="mt-3 text-sm font-medium leading-6 text-foreground">
                {item.message}
              </p>

              {canOpenLead ? (
                <div className="mt-3">
                  <Link
                    href={`/dashboard/leads/${item.leadId}`}
                    className="inline-flex items-center text-sm font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    Open lead
                    <ArrowUpRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
