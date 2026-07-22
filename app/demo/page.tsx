import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { LeadFlowLogo } from "@/components/brand/lead-flow-logo";
import { DemoRoleSelector } from "@/components/demo/demo-role-selector";
import { Button } from "@/components/ui/button";
import { getCurrentUserId } from "@/lib/auth";
import { getCurrentDemoRole } from "@/lib/demo-auth.server";
import { isDemoLoginEnabled } from "@/lib/demo-config.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore LeadFlow",
  description: "Choose an Owner, Admin, or Member view of the LeadFlow demo.",
};

export default async function DemoPage() {
  const demoEnabled = isDemoLoginEnabled();
  const currentUserId = demoEnabled ? await getCurrentUserId() : null;
  const currentDemoRole = demoEnabled
    ? await getCurrentDemoRole(currentUserId)
    : null;

  return (
    <main className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_15%_8%,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_88%_12%,rgba(16,185,129,0.14),transparent_34%),linear-gradient(180deg,#fbfcfe_0%,#f1f6fb_56%,#f8fafc_100%)] px-4 py-6 text-slate-900 dark:bg-[radial-gradient(circle_at_15%_8%,rgba(8,145,178,0.24),transparent_30%),radial-gradient(circle_at_88%_12%,rgba(5,150,105,0.2),transparent_34%),linear-gradient(180deg,#020617_0%,#0b1220_56%,#0f172a_100%)] dark:text-slate-100 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex rounded-xl transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
          >
            <LeadFlowLogo />
          </Link>
          <Button asChild variant="ghost" size="sm" className="rounded-xl">
            <Link href="/sign-in">
              <ArrowLeft aria-hidden="true" />
              Sign in
            </Link>
          </Button>
        </header>

        <section className="pb-7 pt-14 text-center sm:pb-10 sm:pt-20">
          <p className="text-xs font-semibold tracking-[0.18em] text-cyan-700 uppercase dark:text-cyan-300">
            Interactive product walkthrough
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-medium tracking-tight text-slate-950 dark:text-slate-50 sm:text-5xl">
            Explore LeadFlow by role.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
            Choose a role to see the workspace and permissions available to that team member.
          </p>
        </section>

        {demoEnabled ? (
          <DemoRoleSelector currentDemoRole={currentDemoRole} />
        ) : (
          <section className="mx-auto max-w-xl rounded-3xl border bg-background/90 p-7 text-center shadow-[0_20px_50px_-36px_rgba(15,23,42,0.55)] sm:p-9">
            <span className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <LockKeyhole className="size-5" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
              The interactive demo is unavailable right now.
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Please return to the sign-in page or check back shortly.
            </p>
            <Button asChild className="mt-6">
              <Link href="/sign-in">Go to sign in</Link>
            </Button>
          </section>
        )}

        <aside className="mx-auto mt-7 flex max-w-3xl items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm leading-6 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/45 dark:text-slate-300">
          <LockKeyhole className="mt-0.5 size-4 shrink-0 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
          <p>
            This is a shared, temporary demo workspace. Your session uses a short-lived sign-in link, and the sample CRM data is read-only for every visitor.
          </p>
        </aside>
      </div>
    </main>
  );
}
