import { notFound } from "next/navigation";
import { AcceptInvitationCard } from "@/components/settings/accept-invitation-card";
import { getCurrentUserId } from "@/lib/auth";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!/^[A-Za-z0-9_-]{20,200}$/.test(token)) notFound();

  return <AcceptInvitationCard token={token} isSignedIn={Boolean(await getCurrentUserId())} />;
}
