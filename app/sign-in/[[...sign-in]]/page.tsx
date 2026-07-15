import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { LeadFlowLogo } from "@/components/brand/lead-flow-logo";
import { Button } from "@/components/ui/button";

type SignInPageProps = {
  searchParams?: Promise<{
    demo?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = (await searchParams) ?? {};
  const demoUnavailable = params.demo === "unavailable";

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mx-auto mb-6 flex w-fit items-center justify-center transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <LeadFlowLogo />
        </Link>
        <div className="mb-5 rounded-3xl border bg-background p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Try Demo
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Explore LeadFlow with sample CRM data.
              </p>
            </div>

            <Button asChild className="sm:shrink-0">
              <Link href="/demo" prefetch={false}>Try Demo</Link>
            </Button>
          </div>

          {demoUnavailable ? (
            <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Demo login is temporarily unavailable. Please try again in a moment.
            </p>
          ) : null}
        </div>
        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/dashboard"
          forceRedirectUrl="/dashboard"
        />
      </div>
    </main>
  );
}
