import { redirect } from "next/navigation";

export default async function ActivityPage() {
  redirect("/dashboard/settings/activity");
}
