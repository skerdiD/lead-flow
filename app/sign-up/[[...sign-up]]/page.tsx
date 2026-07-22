import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { LeadFlowLogo } from "@/components/brand/lead-flow-logo";

type SignUpPageProps = {
  searchParams?: Promise<{ redirectTo?: string }>;
};

function getSafeRedirectPath(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = (await searchParams) ?? {};
  const redirectTo = getSafeRedirectPath(params.redirectTo);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mx-auto mb-6 flex w-fit items-center justify-center transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <LeadFlowLogo />
        </Link>
        <SignUp
          path="/sign-up"
          routing="path"
          signInUrl={`/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`}
          fallbackRedirectUrl={redirectTo}
          forceRedirectUrl={redirectTo}
        />
      </div>
    </main>
  );
}
