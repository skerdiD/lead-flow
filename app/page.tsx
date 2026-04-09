import { auth } from "@clerk/nextjs/server";
import { HomePageMarketing } from "@/components/marketing/home-page";

export default async function HomePage() {
  const { userId } = await auth();

  return <HomePageMarketing userId={userId} />;
}
