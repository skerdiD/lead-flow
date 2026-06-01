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
  Target,
  UsersRound,
  Workflow,
} from "lucide-react";
import { LeadFlowLogo } from "@/components/brand/lead-flow-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Why LeadFlow", href: "#why" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Workflow", href: "#workflow" },
  { label: "Preview", href: "#preview" },
];

const trustProofPoints = [
  {
    title: "Structured status pipeline",
    detail:
      "Use clear checkpoints from New to Proposal so the team always knows next actions.",
  },
  {
    title: "Timeline-level visibility",
    detail:
      "Creation, edits, status changes, and notes are captured in one activity history.",
  },
  {
    title: "Private workspace boundaries",
    detail:
      "Lead records stay account-scoped to protect deal context and customer data.",
  },
  {
    title: "Built for daily execution",
    detail:
      "Dashboard, leads, and activity views are designed for fast morning and end-of-day reviews.",
  },
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
    title: "Full pipeline visibility",
    description:
      "See stage distribution, stalled deals, and priority opportunities in one dashboard view.",
  },
  {
    title: "Lead management clarity",
    description:
      "Open lead records with contact details, status, source, and owner context in one place.",
  },
  {
    title: "Activity history confidence",
    description:
      "Review every status move and note before follow-ups so no deal context gets lost.",
  },
];

const technicalProof = [
  "Next.js App Router",
  "Clerk Authentication",
  "Drizzle + PostgreSQL",
  "Validated Server Actions",
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
  variant?: "default" | "scale";
};

function LoadIn({
  children,
  className,
  delay = 0,
  variant = "default",
}: LoadInProps) {
  const normalizedDelay = Math.min(delay, 560);

  return (
    <div
      className={cn(
        variant === "scale" ? "leadflow-load-in-scale" : "leadflow-load-in",
        className
      )}
      style={{ animationDelay: `${normalizedDelay}ms` }}
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
      <h2 className="mt-3 font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
        {description}
      </p>
    </div>
  );
}

export function HomePageMarketing() {
  const primaryHref = "/sign-up";
  const primaryLabel = "Start free";
  const workspaceHref = "/dashboard";
  const footerYear = 2026;

  return (
    <div className="relative isolate min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_14%_10%,rgba(14,165,233,0.2),transparent_30%),radial-gradient(circle_at_88%_6%,rgba(16,185,129,0.18),transparent_34%),linear-gradient(180deg,#fbfcfe_0%,#f1f6fb_54%,#f8fafc_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_14%_10%,rgba(8,145,178,0.24),transparent_30%),radial-gradient(circle_at_88%_6%,rgba(5,150,105,0.22),transparent_34%),linear-gradient(180deg,#020617_0%,#0b1220_56%,#0f172a_100%)] dark:text-slate-100">
      <noscript>
        <style>{`.leadflow-scroll-reveal,.leadflow-scroll-reveal-scale{opacity:1!important;transform:none!important;}`}</style>
      </noscript>

      <header className="leadflow-nav-shell sticky top-0 z-40 border-b border-black/8 bg-white/72 shadow-[0_18px_60px_-48px_rgba(15,23,42,0.5)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/62">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <LoadIn delay={0} className="leadflow-nav-item">
            <Link href="/" className="inline-flex items-center gap-2.5 transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950">
              <LeadFlowLogo />
            </Link>
          </LoadIn>

          <LoadIn delay={80} className="leadflow-nav-item hidden md:flex">
            <nav className="hidden items-center gap-7 text-sm text-slate-600 dark:text-slate-300 md:flex">
              {navLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="leadflow-nav-link"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </LoadIn>

          <LoadIn delay={160} className="leadflow-nav-item">
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="leadflow-hover-button hidden h-9 rounded-xl px-3 text-slate-700 hover:text-slate-900 focus-visible:ring-cyan-400/35 dark:text-slate-200 dark:hover:text-white sm:inline-flex"
              >
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="leadflow-hover-button h-9 rounded-xl bg-slate-900 px-4 text-white shadow-[0_18px_36px_-24px_rgba(15,23,42,0.7)] hover:bg-slate-800 focus-visible:ring-cyan-400/35 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                <Link href={primaryHref}>{primaryLabel}</Link>
              </Button>
            </div>
          </LoadIn>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-black/10 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[4%] top-10 h-48 w-48 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-500/20" />
            <div className="absolute right-[8%] top-16 h-60 w-60 rounded-full bg-emerald-300/22 blur-3xl dark:bg-emerald-500/16" />
            <div className="absolute left-1/2 top-6 h-28 w-28 -translate-x-1/2 rounded-full border border-white/60 bg-white/35 blur-2xl dark:border-white/10 dark:bg-white/5" />
          </div>

          <div className="relative mx-auto grid w-full max-w-[1200px] gap-10 px-4 pb-16 pt-14 sm:px-6 sm:pb-16 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.98fr)] lg:items-center lg:gap-14 lg:px-8 lg:pb-20 lg:pt-20">
            <div className="relative max-w-xl lg:max-w-2xl">
              <LoadIn delay={60} className="inline-flex">
                <Badge
                  variant="outline"
                  className="rounded-full border-black/10 bg-white/78 px-3.5 py-1 text-[11px] tracking-[0.14em] text-slate-700 uppercase shadow-[0_12px_30px_-22px_rgba(14,165,233,0.5)] backdrop-blur-sm dark:border-white/20 dark:bg-slate-900/72 dark:text-slate-200"
                >
                  Founder-led CRM clarity
                </Badge>
              </LoadIn>

              <LoadIn delay={160}>
                <h1 className="mt-5 max-w-3xl font-[family-name:var(--font-fraunces)] text-4xl leading-[1.03] tracking-[-0.04em] text-slate-950 dark:text-slate-100 sm:text-5xl lg:text-6xl">
                  Close more deals with a clear pipeline, not CRM clutter.
                </h1>
              </LoadIn>

              <LoadIn delay={260}>
                <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                  LeadFlow gives founders and compact teams one private workspace to capture leads quickly, move opportunities through clean status checkpoints, and act on daily activity before momentum drops.
                </p>
              </LoadIn>

              <LoadIn delay={360}>
                <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button
                    asChild
                    size="lg"
                    className="leadflow-hover-button h-11 rounded-xl bg-slate-900 px-6 text-white shadow-[0_22px_44px_-24px_rgba(15,23,42,0.7)] hover:bg-slate-800 focus-visible:ring-cyan-400/35 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                  >
                    <Link href={primaryHref}>
                      {primaryLabel}
                      <ArrowRight className="leadflow-button-arrow size-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="leadflow-hover-button h-11 rounded-xl border-black/12 bg-white/72 px-6 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.32)] hover:border-black/18 hover:bg-white/90 focus-visible:ring-cyan-400/30 dark:border-white/20 dark:bg-slate-900/72 dark:hover:bg-slate-900/85"
                  >
                    <a href="#preview">View live walkthrough</a>
                  </Button>
                </div>
              </LoadIn>

              <LoadIn delay={450}>
                <div className="mt-2">
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="leadflow-hover-button h-8 rounded-xl px-2 text-slate-700 hover:text-slate-900 focus-visible:ring-cyan-400/30 dark:text-slate-200 dark:hover:text-white"
                  >
                    <Link href={workspaceHref}>Already using LeadFlow? Enter workspace</Link>
                  </Button>
                </div>
              </LoadIn>

              <LoadIn delay={540}>
                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {[
                    "No bloated setup",
                    "Private workspace by default",
                    "Designed for daily pipeline reviews",
                  ].map((item) => (
                    <span key={item} className="inline-flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                      {item}
                    </span>
                  ))}
                </div>
              </LoadIn>
            </div>

            <LoadIn delay={280} variant="scale" className="relative lg:ml-auto">
              <div className="leadflow-floating-preview relative">
                <div className="pointer-events-none absolute inset-x-10 -top-4 h-16 rounded-full bg-cyan-200/40 blur-3xl dark:bg-cyan-500/15" />
                <Card className="leadflow-hover-preview relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/88 py-0 shadow-[0_38px_110px_-52px_rgba(15,23,42,0.6)] ring-0 dark:border-white/15 dark:bg-slate-900/92 dark:shadow-[0_36px_90px_-50px_rgba(2,6,23,0.9)]">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(103,232,249,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.18),transparent_34%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_36%)]" />
                  <CardContent className="relative p-0">
                    <div className="flex items-center justify-between border-b border-black/10 bg-slate-50/80 px-4 py-3 text-xs text-slate-500 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-400">
                      <span>LeadFlow command view</span>
                      <span>Auto-save enabled</span>
                    </div>
                    <div className="grid gap-3 p-4 sm:grid-cols-[228px_1fr]">
                      <div className="rounded-2xl border border-black/10 bg-white/90 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-white/10 dark:bg-slate-900/84 dark:shadow-none">
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
                            className="mt-2 flex items-center justify-between rounded-xl border border-black/8 bg-slate-50/90 px-2.5 py-2 text-xs shadow-sm dark:border-white/10 dark:bg-slate-950/70 dark:shadow-none"
                          >
                            <span className="text-slate-700 dark:text-slate-200">{label}</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{count}</span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3">
                        <div className="rounded-2xl border border-black/10 bg-white/88 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-white/10 dark:bg-slate-900/82 dark:shadow-none">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Daily activity timeline</p>
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                              Synced
                            </span>
                          </div>
                          <div className="mt-3 space-y-2.5">
                            {[
                              "Qualified Acme Labs after discovery call",
                              "Status moved to Proposal for North Peak",
                              "New inbound lead from referral channel",
                            ].map((event) => (
                              <div key={event} className="flex items-start gap-2 rounded-lg bg-slate-50/90 px-3 py-2 text-xs text-slate-700 shadow-sm dark:bg-slate-950/70 dark:text-slate-300 dark:shadow-none">
                                <span className="mt-1 size-1.5 rounded-full bg-cyan-500" />
                                <span>{event}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-black/10 bg-white/88 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-white/10 dark:bg-slate-900/82 dark:shadow-none">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Next priority</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">4 follow-ups due today</p>
                          </div>
                          <div className="rounded-2xl border border-black/10 bg-white/88 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-white/10 dark:bg-slate-900/82 dark:shadow-none">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Workspace health</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">All changes tracked</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </LoadIn>
          </div>

          <div className="mx-auto w-full max-w-[1200px] px-4 pb-14 sm:px-6 lg:px-8">
            <LoadIn delay={210} className="rounded-3xl border border-black/10 bg-white/78 px-5 py-5 shadow-[0_20px_55px_-42px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/55">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {trustProofPoints.map((item, index) => (
                  <div key={item.title} className="rounded-2xl border border-black/10 bg-white/82 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-white/10 dark:bg-slate-900/70 dark:shadow-none">
                    <p className="text-xs font-semibold tracking-[0.12em] text-cyan-700 uppercase dark:text-cyan-300">
                      Proof {index + 1}
                    </p>
                    <p className="mt-2 text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">{item.title}</p>
                    <p className="mt-1.5 text-xs leading-5 text-slate-600 dark:text-slate-300">{item.detail}</p>
                  </div>
                ))}
              </div>
            </LoadIn>
          </div>
        </section>

        <section id="why" className="scroll-mt-24 py-16 sm:py-20">
          <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <SectionIntro
                eyebrow="Why LeadFlow"
                title="Built for daily sales control"
                description="LeadFlow gives founders and compact teams a focused system to capture leads, move status, and keep momentum visible every day."
              />
            </ScrollReveal>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {whyLeadFlowCards.map((item, index) => {
                const Icon = item.icon;
                return (
                  <ScrollReveal key={item.title} delay={index * 45}>
                    <Card className="leadflow-hover-card h-full rounded-3xl border border-black/10 bg-white/85 shadow-sm ring-0 dark:border-white/10 dark:bg-slate-900/75">
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
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>

        <section id="capabilities" className="scroll-mt-24 border-y border-black/10 bg-white/65 py-16 dark:border-white/10 dark:bg-slate-950/45 sm:py-20">
          <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <SectionIntro
                eyebrow="Key capabilities"
                title="Everything your lead workflow needs"
                description="A practical set of tools that keeps pipeline visibility high and daily decisions fast."
              />
            </ScrollReveal>

            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((item, index) => (
                <ScrollReveal key={item.title} delay={index * 35}>
                  <Card className="leadflow-hover-card h-full rounded-3xl border border-black/10 bg-white/90 shadow-sm ring-0 transition-colors hover:border-black/20 dark:border-white/10 dark:bg-slate-900/80 dark:hover:border-white/20">
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
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-24 py-16 sm:py-20">
          <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <SectionIntro
                eyebrow="Workflow"
                title="A simple 3-step daily rhythm"
                description="Run the same clean process every day to keep opportunities progressing."
              />
            </ScrollReveal>

            <div className="relative mt-10 grid gap-4 md:grid-cols-3 lg:gap-5">
              <div className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-7 hidden h-px bg-gradient-to-r from-cyan-200 via-emerald-300 to-cyan-200 md:block dark:from-cyan-900 dark:via-emerald-700 dark:to-cyan-900" />
              {workflowSteps.map((step, index) => (
                <ScrollReveal key={step.title} delay={index * 60}>
                  <Card className="leadflow-hover-card h-full rounded-3xl border border-black/10 bg-white/85 shadow-sm ring-0 dark:border-white/10 dark:bg-slate-900/75">
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
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section id="preview" className="scroll-mt-24 border-y border-black/10 bg-slate-100/55 py-16 dark:border-white/10 dark:bg-slate-900/40 sm:py-20">
          <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <SectionIntro
                eyebrow="Product preview"
                title="See LeadFlow like an operator, not a spectator"
                description="One focused workspace for pipeline visibility, lead management, and activity history your team can trust every day."
              />
            </ScrollReveal>

            <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-7">
              <div className="space-y-5">
                <ScrollReveal variant="scale">
                  <Card className="leadflow-hover-preview overflow-hidden rounded-[2rem] border border-black/10 bg-white/90 py-0 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.55)] ring-0 dark:border-white/10 dark:bg-slate-900/85 dark:shadow-[0_34px_100px_-54px_rgba(2,6,23,0.92)]">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between border-b border-black/10 bg-slate-50/80 px-4 py-3 text-xs text-slate-500 dark:border-white/10 dark:bg-slate-950/65 dark:text-slate-400">
                        <span>LeadFlow dashboard</span>
                        <span>Pipeline and momentum snapshot</span>
                      </div>
                      <div className="p-4">
                        <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
                          <Image
                            src="/screenshots/dashboard-overview.png"
                            alt="LeadFlow dashboard preview"
                            width={1440}
                            height={900}
                            className="h-auto w-full"
                            priority
                          />
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          {[
                            "Pipeline stage coverage",
                            "Source and status visibility",
                            "Daily next-action focus",
                          ].map((chip) => (
                            <div
                              key={chip}
                              className="rounded-lg border border-black/10 bg-slate-50/85 px-2.5 py-2 text-[11px] font-medium text-slate-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300"
                            >
                              {chip}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>

                <ScrollReveal delay={90} variant="scale">
                  <Card className="leadflow-hover-preview overflow-hidden rounded-3xl border border-black/10 bg-white/90 py-0 shadow-sm ring-0 dark:border-white/10 dark:bg-slate-900/80">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between border-b border-black/10 bg-slate-50/70 px-4 py-3 text-xs text-slate-500 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-400">
                        <span>Leads workspace</span>
                        <span>Status + ownership</span>
                      </div>
                      <div className="p-4">
                        <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                          <Image
                            src="/screenshots/leads-workspace.png"
                            alt="LeadFlow leads management preview"
                            width={1180}
                            height={760}
                            className="h-auto w-full"
                          />
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          {[
                            "Fast search and filters",
                            "Stage sorting and ownership view",
                            "Bulk actions from one table",
                          ].map((chip) => (
                            <div
                              key={chip}
                              className="rounded-lg border border-black/10 bg-slate-50/85 px-2.5 py-2 text-[11px] font-medium text-slate-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300"
                            >
                              {chip}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              </div>

              <div className="space-y-5">
                {previewHighlights.map((item, index) => (
                  <ScrollReveal key={item.title} delay={index * 55}>
                    <Card className="leadflow-hover-card rounded-3xl border border-black/10 bg-white/90 shadow-sm ring-0 dark:border-white/10 dark:bg-slate-900/80">
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
                  </ScrollReveal>
                ))}

                <ScrollReveal delay={165}>
                  <Card className="leadflow-hover-card rounded-3xl border border-black/10 bg-white/90 shadow-sm ring-0 dark:border-white/10 dark:bg-slate-900/80">
                    <CardContent className="p-6">
                      <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase dark:text-slate-400">
                        Daily workflow in LeadFlow
                      </p>
                      <div className="mt-4 space-y-2.5">
                        {[
                          "Capture new inbound leads in under a minute.",
                          "Move opportunities through clear status checkpoints.",
                          "Review activity history and prioritize follow-ups.",
                        ].map((step) => (
                          <div
                            key={step}
                            className="rounded-xl border border-black/10 bg-slate-50/85 px-3 py-2.5 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200"
                          >
                            {step}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-start lg:px-8">
            <ScrollReveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-[0.1em] text-emerald-700 uppercase dark:border-emerald-900/70 dark:bg-emerald-900/30 dark:text-emerald-300">
                <Target className="size-3.5" />
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
            </ScrollReveal>

            <ScrollReveal delay={85} variant="scale">
              <Card className="leadflow-hover-card rounded-[2rem] border border-black/10 bg-white/90 py-0 shadow-[0_22px_70px_-46px_rgba(15,23,42,0.55)] ring-0 dark:border-white/10 dark:bg-slate-900/85">
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
            </ScrollReveal>
          </div>
        </section>

        <section id="cta" className="scroll-mt-24 pb-16 sm:pb-20">
          <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <div className="overflow-hidden rounded-[2.2rem] border border-cyan-200/60 bg-[radial-gradient(circle_at_12%_14%,rgba(103,232,249,0.28),transparent_35%),radial-gradient(circle_at_88%_78%,rgba(16,185,129,0.3),transparent_45%),linear-gradient(135deg,#0f172a_0%,#0f3a4d_52%,#115e59_100%)] px-6 py-14 text-center text-white shadow-[0_30px_100px_-42px_rgba(15,23,42,0.65)] sm:px-10">
                <p className="text-xs font-semibold tracking-[0.16em] text-cyan-100 uppercase">Get started</p>
                <h2 className="mt-4 font-[family-name:var(--font-fraunces)] text-3xl tracking-tight sm:text-5xl">
                  Start free and run a cleaner pipeline today
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-cyan-50/90 sm:text-base">
                  LeadFlow gives founder-led teams structured status movement, clear activity history, and a private workspace that keeps daily sales execution focused.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Button asChild size="lg" className="leadflow-hover-button h-11 rounded-xl bg-white px-6 text-slate-900 shadow-[0_20px_40px_-24px_rgba(255,255,255,0.85)] hover:bg-cyan-50 focus-visible:ring-white/35">
                    <Link href={primaryHref}>
                      {primaryLabel}
                      <ArrowRight className="leadflow-button-arrow size-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="leadflow-hover-button h-11 rounded-xl border-white/40 bg-white/10 px-6 text-white hover:bg-white/20 focus-visible:ring-white/30"
                  >
                    <Link href={workspaceHref}>Enter workspace</Link>
                  </Button>
                </div>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
                  {technicalProof.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-[11px] font-medium tracking-wide text-cyan-50"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/10 bg-slate-950 text-slate-300 dark:border-white/10">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr] lg:px-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <LeadFlowLogo
                markClassName="size-8 rounded-xl shadow-none"
                wordmarkClassName="text-white"
              />
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
              <Link href="/sign-in" className="block transition-colors hover:text-white">
                Sign in
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
