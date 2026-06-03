import { getActivityFeed } from "@/app/dashboard/activity/queries";
import { ActivityEmptyState } from "@/components/activity/activity-empty-state";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { PageHeader } from "@/components/dashboard/page-header";

export default async function ActivityPage() {
  const activities = await getActivityFeed();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden sm:gap-6">
      <PageHeader
        eyebrow="Workspace feed"
        title="Activity"
        description="A timeline of the latest lead actions in your workspace."
        className="shrink-0"
      />

      {activities.length === 0 ? (
        <ActivityEmptyState />
      ) : (
        <ActivityFeed items={activities} />
      )}
    </div>
  );
}
