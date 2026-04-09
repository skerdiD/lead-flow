import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  LayoutDashboard,
  LockKeyhole,
  Sparkles,
  Target,
  UsersRound,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type HomePageProps = {
  userId?: string | null;
};

const navLinks = [
  { label: "Why LeadFlow", href: "#why" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Workflow", href: "#workflow" },
  { label: "Preview", href: "#preview" },
];

const trustMetrics = [
  { value: "<5 min", label: "To capture and qualify new leads" },
  { value: "1 timeline", label: "For every status move and note" },
  { value: "Private", label: "Workspace by default" },
  { value: "Daily", label: "Review rhythm for compact teams" },
];

const whyLeadFlowCards = [
  {
    title: "Pipeline clarity without CRM bloat",
    description:
      "Keep stages clean, visible, and easy to review so every rep knows what to do next.",
    icon: Workflow,
  },
  {
    title: "Capture leads in seconds",
    description:
      "Fast forms and practical defaults help founders log new opportunities before context gets lost.",
    icon: Target,
  },
  {
    title: "See daily momentum in one place",
    description:
      "Track creation, edits, status changes, and notes through a focused activity timeline.",
    icon: Clock3,
  },
  {
    title: "Secure, account-scoped workspace",
    description:
      "Every lead record stays private to the signed-in account with clear access boundaries.",
    icon: LockKeyhole,
  },
];

const capabilities = [
  {
    title: "Lead and contact profiles",
    description:
      "Store contact details, source, value, and owner fields in one structured record.",
  },
  {
    title: "Clear status checkpoints",
    description:
      "Move each opportunity through predictable stages so the pipeline stays reliable.",
  },
  {
    title: "Timeline-first activity feed",
    description:
      "Review exactly what changed and when to prioritize follow-ups with confidence.",
  },
  {
    title: "Focused dashboard insights",
    description:
      "Use stage and source views to identify bottlenecks and where quality leads come from.",
  },
  {
    title: "Built for founder teams",
    description:
      "A compact interface that supports daily sales routines without heavy onboarding.",
  },
  {
    title: "Fast action from every view",
    description:
      "Open lead details, update status, and keep deals moving without context switching.",
  },
];

const workflowSteps = [
  {
    title: "Capture",
    description:
      "Add a lead with clean essentials and assign the right status from day one.",
  },
  {
    title: "Move",
    description:
      "Progress opportunities through checkpoints as conversations and qualification evolve.",
  },
  {
    title: "Act",
    description:
      "Use the activity timeline and dashboard view to prioritize the deals worth attention now.",
  },
];

const previewHighlights = [
  {
    title: "Pipeline board visibility",
    description:
      "Track stage distribution at a glance and quickly spot stalled opportunities.",
  },
  {
    title: "Activity history context",
    description:
      "Understand what changed before every follow-up conversation.",
  },
  {
    title: "Lean workspace speed",
    description:
      "Fast interactions for founders and compact sales teams who review daily.",
  },
];

const founderFocusPoints = [
  "Designed for founders and compact revenue teams, not enterprise admin overhead.",
  "Prioritizes daily execution: capture leads, move status, review activity, and follow up.",
  "Keeps the interface practical so pipeline reviews stay fast even as volume grows.",
];

type LoadInProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

function LoadIn({ children, className, delay = 0 }: LoadInProps) {
  return (
    <div
      className={cn("animate-in fade-in-0 duration-700", className)}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {children}
    </div>
  );
}

type SectionIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

function SectionIntro({ eyebrow, title, description }: SectionIntroProps) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold tracking-[0.16em] text-cyan-700 uppercase dark:text-cyan-300">
        {eyebrow}
      </p>
      <h2 className="mt-4 font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
        {description}
      </p>
    </div>
  );
}

export function HomePageMarketing({ userId }: HomePageProps) {
  const primaryHref = userId ? "/dashboard" : "/sign-up";
  const primaryLabel = userId ? "Enter workspace" : "Start free";
  const footerYear = 2026;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_14%_10%,rgba(14,165,233,0.2),transparent_30%),radial-gradient(circle_at_88%_6%,rgba(16,185,129,0.18),transparent_34%),linear-gradient(180deg,#f9fbfd_0%,#f2f5fa_56%,#f8fafc_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_14%_10%,rgba(8,145,178,0.24),transparent_30%),radial-gradient(circle_at_88%_6%,rgba(5,150,105,0.22),transparent_34%),linear-gradient(180deg,#020617_0%,#0b1220_56%,#0f172a_100%)] dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/72 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 text-white shadow-sm">
              <Sparkles className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              LeadFlow
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-slate-600 dark:text-slate-300 md:flex">
            {navLinks.map((item) => (
              <a key={item.label} href={item.href} className="transition-colors hover:text-slate-900 dark:hover:text-slate-100">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {!userId ? (
              <Button asChild variant="ghost" size="sm" className="hidden h-9 rounded-xl px-3 sm:inline-flex">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            ) : null}
            <Button
              asChild
              size="sm"
              className="h-9 rounded-xl bg-slate-900 px-4 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-black/10 dark:border-white/10">
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.97fr)] lg:px-8 lg:pb-24 lg:pt-20">
            <LoadIn className="relative max-w-2xl">
              <Badge
                variant="outline"
                className="rounded-full border-black/15 bg-white/75 px-3 py-1 text-[11px] tracking-[0.12em] text-slate-700 uppercase dark:border-white/20 dark:bg-slate-900/70 dark:text-slate-200"
              >
                Lean CRM for founders and compact teams
              </Badge>

              <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-4xl leading-[1.06] tracking-tight text-slate-950 dark:text-slate-100 sm:text-5xl lg:text-6xl">
                LeadFlow keeps your pipeline clear, your status movement structured, and your team focused on the right deals.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                Manage leads, contacts, and daily sales activity in a private workspace designed for execution without CRM bloat.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="h-11 rounded-xl bg-slate-900 px-6 text-white shadow-md hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  <Link href={primaryHref}>
                    {primaryLabel}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-11 rounded-xl border-black/15 bg-white/70 px-6 dark:border-white/20 dark:bg-slate-900/70">
                  <a href="#preview">View product walkthrough</a>
                </Button>
              </div>

              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                {[
                  "Capture leads quickly",
                  "Move through clear status checkpoints",
                  "Review timeline and act with confidence",
                ].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    {item}
                  </span>
                ))}
              </div>
            </LoadIn>

            <LoadIn delay={120}>
              <Card className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/88 py-0 shadow-[0_34px_100px_-50px_rgba(15,23,42,0.55)] ring-0 dark:border-white/15 dark:bg-slate-900/92 dark:shadow-[0_36px_90px_-50px_rgba(2,6,23,0.9)]">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between border-b border-black/10 bg-slate-50/80 px-4 py-3 text-xs text-slate-500 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-400">
                    <span>LeadFlow workspace</span>
                    <span>Private session active</span>
                  </div>
                  <div className="grid gap-3 p-3 sm:grid-cols-[220px_1fr]">
                    <div className="rounded-2xl border border-black/10 bg-white/85 p-3 dark:border-white/10 dark:bg-slate-900/80">
                      <p className="text-xs font-medium tracking-[0.12em] text-slate-500 uppercase dark:text-slate-400">
                        Pipeline status
                      </p>
                      {[
                        ["New", "12"],
                        ["Contacted", "8"],
                        ["Qualified", "5"],
                        ["Proposal", "3"],
                      ].map(([label, count]) => (
                        <div
                          key={label}
                          className="mt-2 flex items-center justify-between rounded-xl border border-black/8 bg-slate-50/90 px-2.5 py-2 text-xs dark:border-white/10 dark:bg-slate-950/70"
                        >
                          <span className="text-slate-700 dark:text-slate-200">{label}</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{count}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-2xl border border-black/10 bg-white/85 p-4 dark:border-white/10 dark:bg-slate-900/80">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Daily activity timeline</p>
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            Live
                          </span>
                        </div>
                        <div className="mt-3 space-y-2.5">
                          {[
                            "Qualified Acme Labs after discovery call",
                            "Status moved to Proposal for North Peak",
                            "New inbound lead from referral channel",
                          ].map((event) => (
                            <div key={event} className="flex items-start gap-2 rounded-lg bg-slate-50/90 px-3 py-2 text-xs text-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
                              <span className="mt-1 size-1.5 rounded-full bg-cyan-500" />
                              <span>{event}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-black/10 bg-white/85 p-3 dark:border-white/10 dark:bg-slate-900/80">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Next priority</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">4 follow-ups due today</p>
                        </div>
                        <div className="rounded-2xl border border-black/10 bg-white/85 p-3 dark:border-white/10 dark:bg-slate-900/80">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Workspace health</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">All changes tracked</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </LoadIn>
          </div>

          <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
            <LoadIn delay={160} className="rounded-3xl border border-black/10 bg-white/75 px-5 py-5 shadow-sm dark:border-white/10 dark:bg-slate-900/55">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {trustMetrics.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-slate-900/70">
                    <p className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{item.value}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{item.label}</p>
                  </div>
                ))}
              </div>
            </LoadIn>
          </div>
        </section>

        <section id="why" className="py-20 sm:py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <LoadIn>
              <SectionIntro
                eyebrow="Why LeadFlow"
                title="Built for daily sales control"
                description="LeadFlow gives founders and compact teams a focused system to capture leads, move status, and keep momentum visible every day."
              />
            </LoadIn>

            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {whyLeadFlowCards.map((item, index) => {
                const Icon = item.icon;
                return (
                  <LoadIn key={item.title} delay={index * 80}>
                    <Card className="h-full rounded-3xl border border-black/10 bg-white/85 shadow-sm ring-0 dark:border-white/10 dark:bg-slate-900/75">
                      <CardContent className="p-6">
                        <span className="inline-flex size-11 items-center justify-center rounded-2xl border border-cyan-100 bg-cyan-50 text-cyan-700 dark:border-cyan-800/60 dark:bg-cyan-900/30 dark:text-cyan-300">
                          <Icon className="size-5" />
                        </span>
                        <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                          {item.title}
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {item.description}
                        </p>
                      </CardContent>
                    </Card>
                  </LoadIn>
                );
              })}
            </div>
          </div>
        </section>

        <section id="capabilities" className="border-y border-black/10 bg-white/65 py-20 dark:border-white/10 dark:bg-slate-950/45 sm:py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <LoadIn>
              <SectionIntro
                eyebrow="Key capabilities"
                title="Everything your lead workflow needs"
                description="A practical set of tools that keeps pipeline visibility high and daily decisions fast."
              />
            </LoadIn>

            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((item, index) => (
                <LoadIn key={item.title} delay={index * 70}>
                  <Card className="h-full rounded-3xl border border-black/10 bg-white/90 shadow-sm ring-0 transition-colors hover:border-black/20 dark:border-white/10 dark:bg-slate-900/80 dark:hover:border-white/20">
                    <CardContent className="p-6">
                      <div className="inline-flex size-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                        <ChevronRight className="size-4" />
                      </div>
                      <h3 className="mt-4 text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                        {item.title}
                      </h3>
                      <p className="mt-2.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                </LoadIn>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="py-20 sm:py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <LoadIn>
              <SectionIntro
                eyebrow="Workflow"
                title="A simple 3-step daily rhythm"
                description="Run the same clean process every day to keep opportunities progressing."
              />
            </LoadIn>

            <div className="relative mt-12 grid gap-5 md:grid-cols-3">
              <div className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-7 hidden h-px bg-gradient-to-r from-cyan-200 via-emerald-300 to-cyan-200 md:block dark:from-cyan-900 dark:via-emerald-700 dark:to-cyan-900" />
              {workflowSteps.map((step, index) => (
                <LoadIn key={step.title} delay={index * 90}>
                  <Card className="h-full rounded-3xl border border-black/10 bg-white/85 shadow-sm ring-0 dark:border-white/10 dark:bg-slate-900/75">
                    <CardContent className="p-6">
                      <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 text-base font-semibold text-white">
                        {index + 1}
                      </span>
                      <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                        {step.title}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {step.description}
                      </p>
                    </CardContent>
                  </Card>
                </LoadIn>
              ))}
            </div>
          </div>
        </section>

        <section id="preview" className="border-y border-black/10 bg-slate-100/55 py-20 dark:border-white/10 dark:bg-slate-900/40 sm:py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <LoadIn>
              <SectionIntro
                eyebrow="Product preview"
                title="Pipeline and activity visibility in one workspace"
                description="Review your dashboard, inspect lead movement, and take action without leaving context."
              />
            </LoadIn>

            <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <LoadIn>
                <Card className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/90 py-0 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.55)] ring-0 dark:border-white/10 dark:bg-slate-900/85 dark:shadow-[0_34px_100px_-54px_rgba(2,6,23,0.92)]">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between border-b border-black/10 bg-slate-50/80 px-4 py-3 text-xs text-slate-500 dark:border-white/10 dark:bg-slate-950/65 dark:text-slate-400">
                      <span>LeadFlow dashboard</span>
                      <span>Live pipeline snapshot</span>
                    </div>
                    <div className="p-3">
                      <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
                        <Image
                          src="/screenshoots/Image1.png"
                          alt="LeadFlow dashboard preview"
                          width={1440}
                          height={900}
                          className="h-auto w-full"
                          priority
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </LoadIn>

              <div className="space-y-4">
                {previewHighlights.map((item, index) => (
                  <LoadIn key={item.title} delay={index * 90}>
                    <Card className="rounded-3xl border border-black/10 bg-white/90 shadow-sm ring-0 dark:border-white/10 dark:bg-slate-900/80">
                      <CardContent className="p-6">
                        <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                          {index === 0 ? (
                            <LayoutDashboard className="size-4" />
                          ) : index === 1 ? (
                            <CalendarCheck2 className="size-4" />
                          ) : (
                            <UsersRound className="size-4" />
                          )}
                        </span>
                        <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {item.description}
                        </p>
                      </CardContent>
                    </Card>
                  </LoadIn>
                ))}

                <LoadIn delay={260}>
                  <Card className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 py-0 shadow-sm ring-0 dark:border-white/10 dark:bg-slate-900/80">
                    <CardContent className="p-0">
                      <div className="border-b border-black/10 bg-slate-50/70 px-4 py-3 text-xs text-slate-500 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-400">
                        Activity feed
                      </div>
                      <div className="p-3">
                        <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                          <Image
                            src="/screenshoots/Image4.png"
                            alt="LeadFlow activity timeline preview"
                            width={1180}
                            height={760}
                            className="h-auto w-full"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </LoadIn>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:px-8">
            <LoadIn>
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-[0.1em] text-emerald-700 uppercase dark:border-emerald-900/70 dark:bg-emerald-900/30 dark:text-emerald-300">
                <Sparkles className="size-3.5" />
                Founder-focused positioning
              </p>
              <h2 className="mt-5 font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
                A compact CRM workflow for teams that move fast
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                LeadFlow is intentionally lean: enough structure to keep your pipeline healthy, without adding heavyweight process.
              </p>
              <ul className="mt-7 space-y-3">
                {founderFocusPoints.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="mt-0.5 size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </LoadIn>

            <LoadIn delay={120}>
              <Card className="rounded-[2rem] border border-black/10 bg-white/90 py-0 shadow-[0_22px_70px_-46px_rgba(15,23,42,0.55)] ring-0 dark:border-white/10 dark:bg-slate-900/85">
                <CardContent className="p-6 sm:p-7">
                  <p className="text-xs font-medium tracking-[0.12em] text-slate-500 uppercase dark:text-slate-400">Daily review ritual</p>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    Start every morning with a clear action list
                  </h3>
                  <div className="mt-6 space-y-3">
                    {[
                      "Review fresh leads and assign status",
                      "Check timeline updates from yesterday",
                      "Prioritize follow-ups by stage and value",
                      "Close the day with next-step notes",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-center justify-between rounded-xl border border-black/10 bg-slate-50/85 px-3 py-2.5 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-950/65 dark:text-slate-200"
                      >
                        <span>{item}</span>
                        <CheckCircle2 className="size-4 text-cyan-600 dark:text-cyan-300" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </LoadIn>
          </div>
        </section>

        <section id="cta" className="pb-20 sm:pb-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <LoadIn>
              <div className="overflow-hidden rounded-[2.2rem] border border-cyan-200/60 bg-[radial-gradient(circle_at_12%_14%,rgba(103,232,249,0.28),transparent_35%),radial-gradient(circle_at_88%_78%,rgba(16,185,129,0.3),transparent_45%),linear-gradient(135deg,#0f172a_0%,#0f3a4d_52%,#115e59_100%)] px-6 py-14 text-center text-white shadow-[0_30px_100px_-42px_rgba(15,23,42,0.65)] sm:px-10">
                <p className="text-xs font-semibold tracking-[0.16em] text-cyan-100 uppercase">Start your workspace</p>
                <h2 className="mt-4 font-[family-name:var(--font-fraunces)] text-3xl tracking-tight sm:text-5xl">
                  Keep your lead pipeline sharp every day
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-cyan-50/90 sm:text-base">
                  LeadFlow helps founders and compact teams capture opportunities quickly, move status with clarity, and act on the right deals first.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Button asChild size="lg" className="h-11 rounded-xl bg-white px-6 text-slate-900 hover:bg-cyan-50">
                    <Link href={primaryHref}>
                      {primaryLabel}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-11 rounded-xl border-white/40 bg-white/10 px-6 text-white hover:bg-white/20"
                  >
                    <a href="#workflow">See the 3-step workflow</a>
                  </Button>
                </div>
              </div>
            </LoadIn>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/10 bg-slate-950 text-slate-300 dark:border-white/10">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr] lg:px-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="inline-flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 text-white">
                <Sparkles className="size-4" />
              </span>
              <span className="text-sm font-semibold text-white">LeadFlow</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">
              Lean CRM workspace for founders and compact teams that need clear pipeline visibility and fast daily execution.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Product</p>
            <div className="mt-4 space-y-2 text-sm text-slate-400">
              <a href="#why" className="block transition-colors hover:text-white">Why LeadFlow</a>
              <a href="#capabilities" className="block transition-colors hover:text-white">Capabilities</a>
              <a href="#preview" className="block transition-colors hover:text-white">Preview</a>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Workflow</p>
            <div className="mt-4 space-y-2 text-sm text-slate-400">
              <a href="#workflow" className="block transition-colors hover:text-white">How it works</a>
              <a href="#cta" className="block transition-colors hover:text-white">Get started</a>
              <Link href={userId ? "/dashboard" : "/sign-in"} className="block transition-colors hover:text-white">
                {userId ? "Workspace" : "Sign in"}
              </Link>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Built for</p>
            <div className="mt-4 space-y-2 text-sm text-slate-400">
              <p>Founders</p>
              <p>Compact sales teams</p>
              <p>Daily pipeline execution</p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/80">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-slate-500 sm:px-6 lg:px-8">
            <span>(c) {footerYear} LeadFlow. All rights reserved.</span>
            <span>Private by default. Built for momentum.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
