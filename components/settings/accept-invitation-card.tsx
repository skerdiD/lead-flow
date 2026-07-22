"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UsersRound } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { acceptWorkspaceInvitationAction } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";

export function AcceptInvitationCard({ token, isSignedIn }: { token: string; isSignedIn: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const redirectTo = `/invite/${token}`;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/30 p-6">
      <section className="w-full max-w-md rounded-3xl border bg-background p-7 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border bg-muted/50">
          <UsersRound className="h-5 w-5 text-foreground" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Join workspace</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Accept this invitation to join the LeadFlow workspace with the role selected by your teammate.
        </p>
        {isSignedIn ? (
          <Button
            className="mt-6 w-full"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await acceptWorkspaceInvitationAction(token);
                if (!result.success) {
                  toast.error(result.message);
                  return;
                }

                toast.success(result.message);
                router.replace("/dashboard");
                router.refresh();
              });
            }}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Accept invitation
          </Button>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">Sign in or create an account with the invited email address to continue.</p>
            <Button asChild className="w-full"><Link href={`/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`}>Sign in to accept</Link></Button>
            <Button asChild variant="outline" className="w-full"><Link href={`/sign-up?redirectTo=${encodeURIComponent(redirectTo)}`}>Create account</Link></Button>
          </div>
        )}
      </section>
    </main>
  );
}
