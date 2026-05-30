import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activityEvents } from "@/db/schema";
import { getCurrentWorkspace } from "@/lib/workspaces";

export type ActivityFeedItem = {
  id: string;
  eventType:
    | "lead_created"
    | "lead_updated"
    | "lead_status_changed"
    | "lead_deleted"
    | "lead_note_added"
    | "lead_note_updated"
    | "lead_note_deleted";
  message: string;
  leadId: string | null;
  leadName: string | null;
  createdAt: Date;
};

export async function getActivityFeed(limit = 40): Promise<ActivityFeedItem[]> {
  const workspace = await getCurrentWorkspace();

  return db
    .select({
      id: activityEvents.id,
      eventType: activityEvents.eventType,
      message: activityEvents.message,
      leadId: activityEvents.leadId,
      leadName: activityEvents.leadName,
      createdAt: activityEvents.createdAt,
    })
    .from(activityEvents)
    .where(eq(activityEvents.workspaceId, workspace.id))
    .orderBy(desc(activityEvents.createdAt))
    .limit(limit);
}
