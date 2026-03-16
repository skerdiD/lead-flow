import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, Clock3, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Activity timeline",
    description:
      "See lead creation, updates, status changes, and deletes in one feed.",
    icon: Clock3,
  },
  {
    title: "Protected by default",
    description:
      "Authentication and lead ownership are scoped per signed-in user.",
    icon: ShieldCheck,
  },
  {
    title: "Fast daily workflow",
    description:
      "Clean leads, filters, statuses, and editing flows designed for momentum.",
    icon: Sparkles,
  },
];

export default async function HomePage() {
  const { userId } = await auth();

  return (
    <main className="min-h-[calc(100vh-4.5rem)] bg-[radial-gradient(80rem_34rem_at_50%_-12%,rgba(0,0,0,0.1),transparent),radial-gradient(55rem_24rem_at_100%_0%,rgba(0,0,0,0.06),transparent)] px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <div className="mx-auto w-full max-w-6xl space-y-12 sm:space-y-14">
        <section className="animate-in fade-in-0 slide-in-from-bottom-1 rounded-3xl border bg-background/95 p-6 shadow-sm duration-500 sm:p-11">
          <div className="mx-auto max-w-[46rem] text-center">
            <Badge className="mx-auto px-3 py-1.5 text-sm font-semibold tracking-tight shadow-sm">
              LeadFlow
            </Badge>

            <h1 className="mx-auto mt-6 max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-[1.08]">
              <span className="relative inline-block pr-1 text-foreground">
                LeadFlow
              </span>
              <span className="block mt-2">
                keeps every sales lead organized, visible, and actionable.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Built for founders and small teams who need a focused CRM flow
              with strong structure and clean execution.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:mt-9 sm:flex-row">
              {userId ? (
                <>
                  <Button
                    asChild
                    size="lg"
                    className="h-10 px-5 font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Link href="/dashboard" className="min-w-[172px]">
                      Open dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-10 px-5 text-foreground/85 transition-all hover:-translate-y-0.5 hover:text-foreground"
                  >
                    <Link href="/dashboard/activity" className="min-w-[172px]">
                      Activity feed
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    asChild
                    size="lg"
                    className="h-10 px-5 font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Link href="/sign-up" className="min-w-[172px]">
                      Create account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-10 px-5 text-foreground/85 transition-all hover:-translate-y-0.5 hover:text-foreground"
                  >
                    <Link href="/sign-in" className="min-w-[172px]">
                      Sign in
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="relative pt-1">
          <div className="pointer-events-none absolute inset-x-16 -top-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="group animate-in fade-in-0 slide-in-from-bottom-1 rounded-3xl border bg-background p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-md"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-muted/55 text-foreground/80 transition-colors duration-300 group-hover:bg-muted/75 group-hover:text-foreground">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h2 className="mt-5 text-base font-semibold tracking-tight text-foreground">
                    {feature.title}
                  </h2>

                  <p className="mt-2.5 text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
