import { getActivityFeed } from "@/app/dashboard/activity/queries";
import { ActivityEmptyState } from "@/components/activity/activity-empty-state";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { PageHeader } from "@/components/dashboard/page-header";

export default async function WorkspaceActivityPage() {
  const activities = await getActivityFeed();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace settings"
        title="Workspace activity"
        description="Review the CRM changes you have permission to see."
      />
      {activities.length === 0 ? (
        <ActivityEmptyState />
      ) : (
        <ActivityFeed items={activities} />
      )}
    </div>
  );
}
