import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activityEvents, leads, type activityEventTypes } from "@/db/schema";
import {
  getCurrentWorkspaceAuthorizationContext,
  getRecordVisibilityConditions,
  hasWorkspacePermission,
} from "@/lib/authorization";

export type ActivityFeedItem = {
  id: string;
  eventType: (typeof activityEventTypes)[number];
  message: string;
  leadId: string | null;
  leadName: string | null;
  createdAt: Date;
};

export async function getActivityFeed(limit = 40): Promise<ActivityFeedItem[]> {
  const context = await getCurrentWorkspaceAuthorizationContext();

  if (hasWorkspacePermission(context.role, "crm:view_all")) {
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
      .where(eq(activityEvents.workspaceId, context.workspaceId))
      .orderBy(desc(activityEvents.createdAt))
      .limit(limit);
  }

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
    .innerJoin(
      leads,
      and(
        eq(activityEvents.leadId, leads.id),
        eq(activityEvents.workspaceId, leads.workspaceId),
      ),
    )
    .where(
      and(
        eq(activityEvents.workspaceId, context.workspaceId),
        ...getRecordVisibilityConditions(
          context,
          leads.workspaceId,
          leads.assignedOwnerUserId,
        ),
      ),
    )
    .orderBy(desc(activityEvents.createdAt))
    .limit(limit);
}
