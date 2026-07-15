import { getActivityFeed } from "@/app/dashboard/activity/queries";
import { ActivityEmptyState } from "@/components/activity/activity-empty-state";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { PageHeader } from "@/components/dashboard/page-header";

export default async function ActivityPage() {
  const activities = await getActivityFeed();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace feed"
        title="Activity"
        description="See the latest changes across your leads."
      />

      {activities.length === 0 ? (
        <ActivityEmptyState />
      ) : (
        <ActivityFeed items={activities} />
      )}
    </div>
  );
}
