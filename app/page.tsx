import { redirect } from "next/navigation";
import { HomePageMarketing } from "@/components/marketing/home-page";
import { getCurrentUserId } from "@/lib/auth";

export default async function HomePage() {
  const userId = await getCurrentUserId();

  if (userId) {
    redirect("/dashboard");
  }

  return <HomePageMarketing />;
}
