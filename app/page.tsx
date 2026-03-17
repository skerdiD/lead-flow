import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Live activity timeline",
    description:
      "Track creation, edits, status moves, and deletions in one focused feed.",
    icon: Clock3,
  },
  {
    title: "Private by default",
    description:
      "Every record is scoped to the account owner, with secure access boundaries.",
    icon: ShieldCheck,
  },
  {
    title: "Fast daily momentum",
    description:
      "Clean filters and structured stages keep pipeline reviews clear and fast.",
    icon: Sparkles,
  },
];

const workflow = [
  "Capture new leads in seconds with clean fields.",
  "Move each lead through clear status checkpoints.",
  "Review activity and act on the right deals first.",
];

export default async function HomePage() {
  const { userId } = await auth();

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[radial-gradient(circle_at_16%_12%,rgba(14,165,233,0.2),transparent_38%),radial-gradient(circle_at_82%_4%,rgba(251,146,60,0.2),transparent_30%),linear-gradient(180deg,#fafaf8_0%,#f1f5f9_56%,#f8fafc_100%)] px-4 pb-16 pt-7 sm:px-6 sm:pb-20 sm:pt-10">
      <div className="pointer-events-none absolute left-[-5rem] top-24 h-52 w-52 rounded-full bg-cyan-200/45 blur-3xl" />
      <div className="pointer-events-none absolute right-[-4rem] top-8 h-56 w-56 rounded-full bg-orange-200/45 blur-3xl" />

      <div className="mx-auto w-full max-w-6xl space-y-8 sm:space-y-10">
        <section className="animate-in fade-in-0 slide-in-from-bottom-1 rounded-4xl border border-black/10 bg-white/85 p-6 shadow-[0_16px_40px_-26px_rgba(15,23,42,0.45)] backdrop-blur-sm duration-500 sm:p-10">
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mx-auto rounded-full border border-black/10 bg-white/80 px-4 py-1.5 text-xs font-semibold tracking-[0.14em] text-foreground/75 uppercase">
              Lean CRM System
            </Badge>

            <h1 className="mx-auto mt-6 max-w-3xl font-[family-name:var(--font-fraunces)] text-4xl leading-[1.08] tracking-tight text-slate-950 sm:text-6xl">
              LeadFlow keeps every sales conversation clear, structured, and ready for action.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-700 sm:text-base">
              Built for founders and compact teams that need daily control over
              pipeline quality without heavy CRM overhead.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-11 min-w-[190px] bg-slate-950 px-6 text-[15px] font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-slate-900"
              >
                <Link href="/dashboard">
                  {userId ? "Open workspace" : "Enter workspace"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 min-w-[190px] border-slate-300 bg-white/75 px-6 text-[15px] font-medium text-slate-700 transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white"
              >
                <Link href="#workflow">See flow preview</Link>
              </Button>
            </div>

            <div className="mx-auto mt-8 grid max-w-2xl gap-2 text-left sm:grid-cols-3">
              <div className="rounded-2xl border border-black/10 bg-white/85 px-4 py-3">
                <p className="text-xs tracking-wide text-slate-500 uppercase">
                  Focus
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Lead-first workflow
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white/85 px-4 py-3">
                <p className="text-xs tracking-wide text-slate-500 uppercase">
                  Visibility
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Full activity timeline
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white/85 px-4 py-3">
                <p className="text-xs tracking-wide text-slate-500 uppercase">
                  Speed
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Built for daily use
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="workflow"
          className="grid gap-4 rounded-4xl border border-black/10 bg-white/78 p-5 shadow-[0_10px_28px_-20px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:grid-cols-3 sm:p-6"
        >
          {workflow.map((step, index) => (
            <article
              key={step}
              className="rounded-3xl border border-black/8 bg-white/80 p-5"
            >
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                Step {index + 1}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-800">{step}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="group animate-in fade-in-0 slide-in-from-bottom-1 rounded-4xl border border-black/10 bg-white/84 p-6 shadow-[0_12px_32px_-22px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-20px_rgba(15,23,42,0.45)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-300/85 bg-slate-50 text-slate-800">
                  <Icon className="h-5 w-5" />
                </div>

                <h2 className="mt-5 text-base font-semibold tracking-tight text-slate-900">
                  {feature.title}
                </h2>

                <p className="mt-2.5 text-sm leading-6 text-slate-700">
                  {feature.description}
                </p>

                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Ready in your current flow
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
