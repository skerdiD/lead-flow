import Link from "next/link";
import type { ReactNode } from "react";
import {
  Building2,
  BriefcaseBusiness,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  Clock3,
  Flag,
  History,
  Mail,
  Phone,
  Radio,
  UserRound,
} from "lucide-react";
import type { LeadDetailsResult } from "@/app/dashboard/leads/[id]/queries";
import { DemoReadOnlyHint } from "@/components/demo/demo-read-only-hint";
import { LeadDealPanel } from "@/components/leads/lead-deal-panel";
import { LeadDetailTabs } from "@/components/leads/lead-detail-tabs";
import { LeadFollowUpBadge } from "@/components/leads/lead-follow-up-badge";
import { LeadFollowUpPanel } from "@/components/leads/lead-follow-up-panel";
import { LeadNotesPanel } from "@/components/leads/lead-notes-panel";
import { LeadOwnerControl } from "@/components/leads/lead-owner-control";
import { LeadQuickActions } from "@/components/leads/lead-quick-actions";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { LeadTasksPanel } from "@/components/leads/lead-tasks-panel";
import { LeadWorkflowPanel } from "@/components/leads/lead-workflow-panel";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DEAL_STAGE_LABELS } from "@/lib/constants/crm";
import { formatCurrencyFromCents } from "@/lib/revenue";
import { groupTasksByTimeline } from "@/lib/tasks";

type LeadDetailsCardProps = {
  lead: LeadDetailsResult;
  readOnly?: boolean;
  canManageAllCrm?: boolean;
  canDelete?: boolean;
  canUpdate?: boolean;
  canAssign?: boolean;
};

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getNextStep(status: LeadDetailsResult["status"]) {
  switch (status) {
    case "New":
      return "Send the first outreach and capture the response quality in a note.";
    case "Contacted":
      return "Confirm timing, budget, and the real decision maker on the next conversation.";
    case "Interested":
      return "Move toward a concrete proposal with scope, budget, and close timing.";
    case "Proposal Sent":
      return "Follow up on the proposal, surface objections, and get the final decision path.";
    case "Closed":
      return "Hand off smoothly and capture onboarding context before the conversation cools down.";
    case "Lost":
      return "Document the reason clearly and set a later re-engagement point if the fit may return.";
    default:
      return "Capture the next step with a date so this lead stays active.";
  }
}

function getTimelineMeta(
  entry: LeadDetailsResult["activityEntries"][number],
) {
  if (entry.eventType === "lead_updated" && entry.message.startsWith("Follow-up scheduled")) {
    return {
      label: "Follow-up scheduled",
      className: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  if (entry.eventType === "lead_updated" && entry.message.startsWith("Follow-up updated")) {
    return {
      label: "Follow-up updated",
      className: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  if (entry.eventType === "lead_updated" && entry.message.startsWith("Follow-up cleared")) {
    return {
      label: "Follow-up cleared",
      className: "border-slate-200 bg-slate-50 text-slate-700",
    };
  }

  switch (entry.eventType) {
    case "lead_created":
      return {
        label: "Lead created",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "lead_status_changed":
      return {
        label: "Status changed",
        className: "border-violet-200 bg-violet-50 text-violet-700",
      };
    case "deal_stage_changed":
      return {
        label: "Deal stage changed",
        className: "border-indigo-200 bg-indigo-50 text-indigo-700",
      };
    case "lead_note_added":
      return {
        label: "Note added",
        className: "border-amber-200 bg-amber-50 text-amber-700",
      };
    case "task_created":
      return {
        label: "Task created",
        className: "border-sky-200 bg-sky-50 text-sky-700",
      };
    case "task_completed":
      return {
        label: "Task completed",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "lead_archived":
      return {
        label: "Archived",
        className: "border-rose-200 bg-rose-50 text-rose-700",
      };
    case "lead_restored":
      return {
        label: "Restored",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "lead_note_updated":
      return {
        label: "Note updated",
        className: "border-slate-200 bg-slate-50 text-slate-700",
      };
    case "lead_note_deleted":
      return {
        label: "Note deleted",
        className: "border-rose-200 bg-rose-50 text-rose-700",
      };
    case "lead_qualified":
      return {
        label: "Lead qualified",
        className: "border-indigo-200 bg-indigo-50 text-indigo-700",
      };
    case "lead_deleted":
      return {
        label: "Lead deleted",
        className: "border-rose-200 bg-rose-50 text-rose-700",
      };
    case "lead_updated":
    default:
      return {
        label: "Lead updated",
        className: "border-slate-200 bg-slate-50 text-slate-700",
      };
  }
}

function DetailItem({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = href ? (
    <Link
      href={href}
      className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
    >
      {value}
    </Link>
  ) : (
    <p className="text-sm font-medium text-foreground">{value}</p>
  );

  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-3">{content}</div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border bg-background/95 p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
    </div>
  );
}

export function LeadDetailsCard({
  lead,
  readOnly = false,
  canManageAllCrm = false,
  canDelete = false,
  canUpdate = false,
  canAssign = false,
}: LeadDetailsCardProps) {
  const nextStep = getNextStep(lead.status);
  const groupedTasks = groupTasksByTimeline(
    lead.taskEntries.map((task) => ({
      ...task,
      leadId: lead.id,
      leadName: lead.fullName,
      leadCompany: lead.company,
    })),
  );
  const openTaskCount = lead.taskEntries.filter((task) => !task.completedAt).length;
  const overdueTaskCount = groupedTasks.overdue.length;
  const completedTaskCount = groupedTasks.completed.length;
  const lastActivity = lead.activityEntries[0] ?? null;
  const companyName = lead.company?.trim() || lead.accountName?.trim() || "No company added";
  const contactEmail = lead.primaryContactEmail?.trim() || lead.email?.trim() || "No email added";
  const contactPhone = lead.primaryContactPhone?.trim() || lead.phone?.trim() || "No phone added";
  const dealValue = lead.dealEntry
    ? formatCurrencyFromCents(lead.dealEntry.valueCents, lead.dealEntry.currency)
    : "No deal value";
  const dealStageLabel = lead.dealEntry
    ? DEAL_STAGE_LABELS[lead.dealEntry.stage]
    : "No opportunity";
  const actionsDisabled = readOnly || !canUpdate || lead.isArchived;
  const followUpHistory = lead.activityEntries.filter(
    (entry) =>
      entry.eventType === "lead_updated" &&
      entry.message.startsWith("Follow-up"),
  );
  const ownerName = lead.owner?.name ?? "Unassigned";
  const ownerInitials = ownerName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="mx-auto w-full max-w-[1440px] space-y-6"
      data-testid="lead-details-page"
    >
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        <Link href="/dashboard/leads" className="hover:text-foreground">Leads</Link>
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate text-foreground" aria-current="page">{lead.fullName}</span>
      </nav>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-background via-background to-muted/35 p-5 shadow-sm ring-1 ring-border sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-4xl">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="leadflow-page-title min-w-0 text-foreground sm:text-4xl">
                  {lead.fullName}
                </h1>
                <LeadStatusBadge status={lead.status} />
                {lead.isArchived ? (
                  <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                    Archived
                  </Badge>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {companyName}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Avatar size="sm">
                    {lead.owner?.imageUrl ? <AvatarImage src={lead.owner.imageUrl} alt="" /> : null}
                    <AvatarFallback>{ownerInitials || "—"}</AvatarFallback>
                  </Avatar>
                  Owner: {ownerName}
                </span>
              </div>
            </div>

            <LeadQuickActions
              leadId={lead.id}
              leadName={lead.fullName}
              dealId={lead.dealEntry?.id ?? null}
              isArchived={lead.isArchived}
              currentStatus={lead.status}
              readOnly={readOnly}
              canDelete={canDelete}
              canUpdate={canUpdate}
              canQualify={!lead.dealEntry && !["Interested", "Proposal Sent", "Closed", "Lost"].includes(lead.status)}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Next follow-up"
              value={
                lead.nextFollowUpDate
                  ? formatDate(lead.nextFollowUpDate)
                  : "Not scheduled"
              }
              helper={
                lead.followUpNote?.trim()
                  ? lead.followUpNote
                  : "No follow-up note has been added yet."
              }
            />
            <SummaryCard
              label="Open tasks"
              value={`${openTaskCount}`}
              helper={
                overdueTaskCount > 0
                  ? `${overdueTaskCount} overdue, ${completedTaskCount} completed`
                  : `${completedTaskCount} completed so far`
              }
            />
            <SummaryCard
              label="Latest activity"
              value={lastActivity ? formatDateTime(lastActivity.createdAt) : "No activity yet"}
              helper={lastActivity ? lastActivity.message : "Your notes, task updates, and status changes will appear here."}
            />
            <SummaryCard
              label="Priority"
              value={lead.followUpPriority[0].toUpperCase() + lead.followUpPriority.slice(1)}
              helper={`${lead.followUpStatus} follow-up`}
            />
            <SummaryCard
              label="Opportunity"
              value={dealValue}
              helper={dealStageLabel}
            />
          </div>
        </div>
      </section>

      {lead.isArchived ? (
        <section className="rounded-3xl border border-rose-100 bg-rose-50/60 p-5 shadow-sm">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            Archived lead
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            This lead is hidden from active pipeline views, but the full workspace history remains intact.
          </p>
        </section>
      ) : null}

      {readOnly ? <DemoReadOnlyHint /> : null}

      <LeadDetailTabs
        overview={(
          <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] xl:gap-6" data-testid="lead-details-content-grid">
            <div className="min-w-0 space-y-5" data-testid="lead-details-main">
              <section className="rounded-3xl bg-background p-5 shadow-sm ring-1 ring-border sm:p-6" data-testid="lead-context-section">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Contact and lead context
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The practical details your team needs before the next conversation.
                </p>
              </div>
              <LeadFollowUpBadge
                date={lead.nextFollowUpDate}
                note={lead.followUpNote}
                priority={lead.followUpPriority}
                status={lead.followUpStatus}
                compact
              />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <DetailItem
                icon={<Building2 className="h-4 w-4" />}
                label="Company"
                value={companyName}
              />
              <DetailItem
                icon={<UserRound className="h-4 w-4" />}
                label="Primary contact"
                value={lead.primaryContactName?.trim() || lead.fullName}
                href={lead.primaryContactId ? `/dashboard/customers/contacts/${lead.primaryContactId}` : undefined}
              />
              <DetailItem
                icon={<BriefcaseBusiness className="h-4 w-4" />}
                label="Job title"
                value={lead.jobTitle?.trim() || "Not provided"}
              />
              <DetailItem
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={contactEmail}
                href={contactEmail === "No email added" ? undefined : `mailto:${contactEmail}`}
              />
              <DetailItem
                icon={<Phone className="h-4 w-4" />}
                label="Phone"
                value={contactPhone}
                href={contactPhone === "No phone added" ? undefined : `tel:${contactPhone}`}
              />
              <DetailItem
                icon={<Radio className="h-4 w-4" />}
                label="Lead source"
                value={lead.source?.trim() || "Unspecified"}
              />
              <DetailItem
                icon={<Clock3 className="h-4 w-4" />}
                label="Assigned owner"
                value={ownerName}
              />
            </div>
              </section>

              <section className="rounded-3xl bg-background p-5 shadow-sm ring-1 ring-border sm:p-6">
                <h2 className="text-sm font-semibold tracking-tight">Relationships</h2>
                <p className="mt-1 text-sm text-muted-foreground">Connected CRM records for this lead.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <DetailItem icon={<Building2 className="h-4 w-4" />} label="Related account" value={lead.accountName ?? "Not linked"} href={lead.accountId && lead.accountName ? `/dashboard/customers/accounts/${lead.accountId}` : undefined} />
                  <DetailItem icon={<UserRound className="h-4 w-4" />} label="Related contact" value={lead.primaryContactName ?? "Not linked"} href={lead.primaryContactId && lead.primaryContactName ? `/dashboard/customers/contacts/${lead.primaryContactId}` : undefined} />
                  <DetailItem icon={<Flag className="h-4 w-4" />} label="Related deal" value={lead.dealEntry?.name ?? "Not linked"} href={lead.dealEntry ? `/dashboard/deals/${lead.dealEntry.id}` : undefined} />
                </div>
              </section>

              <section className="rounded-3xl bg-background p-5 shadow-sm ring-1 ring-border sm:p-6">
                <h2 className="text-sm font-semibold tracking-tight">Record details</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <DetailItem icon={<CalendarDays className="h-4 w-4" />} label="Created" value={formatDateTime(lead.createdAt)} />
                  <DetailItem icon={<Clock3 className="h-4 w-4" />} label="Last activity" value={lastActivity ? formatDateTime(lastActivity.createdAt) : "No activity yet"} />
                  <DetailItem icon={<CalendarDays className="h-4 w-4" />} label="Next follow-up" value={lead.nextFollowUpDate ? formatDateTime(lead.nextFollowUpDate) : "Not scheduled"} />
                  <DetailItem icon={<Flag className="h-4 w-4" />} label="Archive status" value={lead.isArchived ? `Archived${lead.archivedAt ? ` ${formatDate(lead.archivedAt)}` : ""}` : "Active"} />
                </div>
              </section>
            </div>

            <aside className="min-w-0 space-y-5" aria-label="Lead workflow" data-testid="lead-details-sidebar">
              <LeadWorkflowPanel leadId={lead.id} fullName={lead.fullName} currentStatus={lead.status} nextStep={nextStep} readOnly={actionsDisabled} />
              <LeadFollowUpPanel key={`${lead.nextFollowUpDate?.toISOString() ?? "none"}:${lead.followUpPriority}:${lead.followUpStatus}:${lead.followUpNote ?? ""}`} leadId={lead.id} followUp={{ date: lead.nextFollowUpDate, note: lead.followUpNote, priority: lead.followUpPriority, status: lead.followUpStatus }} readOnly={actionsDisabled} />
              {canAssign ? <LeadOwnerControl leadId={lead.id} currentOwnerUserId={lead.assignedOwnerUserId} ownerOptions={lead.ownerOptions} disabled={readOnly || lead.isArchived} /> : null}
            </aside>
          </div>
        )}
        activity={(
          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
            <section id="lead-activity" className="rounded-3xl bg-background p-5 shadow-sm ring-1 ring-border sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Activity timeline
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A readable history of what happened on this lead and when.
              </p>
            </div>
            <History className="h-4 w-4 text-muted-foreground" />
          </div>

          {lead.activityEntries.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed bg-muted/20 px-4 py-8 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border bg-background">
                <CheckCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="mt-4 text-sm font-semibold text-foreground">
                No activity yet
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Status changes, notes, task updates, and follow-up scheduling will appear here automatically.
              </p>
            </div>
          ) : (
            <ol className="mt-5 space-y-3">
              {lead.activityEntries.map((entry, index) => {
                const timelineMeta = getTimelineMeta(entry);

                return (
                  <li key={entry.id} className="relative pl-6">
                    <span className="absolute left-0 top-2 h-2.5 w-2.5 rounded-full bg-primary/70" />
                    {index < lead.activityEntries.length - 1 ? (
                      <span className="absolute left-[4px] top-5 h-[calc(100%-0.25rem)] w-px bg-border" />
                    ) : null}
                    <div className="rounded-2xl border bg-background p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${timelineMeta.className}`}
                        >
                          {timelineMeta.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(entry.createdAt)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-foreground">
                        {entry.message}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
            </section>
            <section className="rounded-3xl bg-background p-5 shadow-sm ring-1 ring-border sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">Follow-up history</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Scheduling changes and completed reminders.</p>
                </div>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </div>
              {followUpHistory.length ? (
                <ul className="mt-5 space-y-3">
                  {followUpHistory.map((entry) => (
                    <li key={entry.id} className="rounded-2xl bg-muted/30 p-4">
                      <p className="text-sm font-medium leading-6">{entry.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">No follow-up history yet.</div>
              )}
            </section>
          </div>
        )}
        tasks={<LeadTasksPanel leadId={lead.id} tasks={lead.taskEntries} readOnly={actionsDisabled} canDelete={canDelete && !lead.isArchived} />}
        notes={(
          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)]">
            <section className="rounded-3xl bg-background p-5 shadow-sm ring-1 ring-border sm:p-6" data-testid="lead-profile-context-section">
              <h2 className="text-sm font-semibold tracking-tight">Profile context</h2>
              <p className="mt-1 text-sm text-muted-foreground">Background saved on the lead record.</p>
              <p className="mt-5 whitespace-pre-wrap rounded-2xl bg-muted/30 p-4 text-sm leading-7">{lead.notes?.trim() || "No profile context has been added yet."}</p>
            </section>
            <LeadNotesPanel leadId={lead.id} notes={lead.noteEntries} currentUserId={lead.viewerUserId} readOnly={actionsDisabled} canManageAllNotes={canManageAllCrm} canDeleteNotes={canDelete && !lead.isArchived} />
          </div>
        )}
        deal={(
          <div className="mx-auto grid min-w-0 max-w-4xl gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <LeadDealPanel leadId={lead.id} deal={lead.dealEntry} readOnly={actionsDisabled} />
            <section className="rounded-3xl bg-background p-5 shadow-sm ring-1 ring-border">
              <h2 className="text-sm font-semibold tracking-tight">Deal context</h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div><dt className="text-muted-foreground">Account</dt><dd className="mt-1 font-medium">{lead.accountName ?? "Not linked"}</dd></div>
                <div><dt className="text-muted-foreground">Contact</dt><dd className="mt-1 font-medium">{lead.primaryContactName ?? "Not linked"}</dd></div>
                <div><dt className="text-muted-foreground">Lead status</dt><dd className="mt-1"><LeadStatusBadge status={lead.status} /></dd></div>
              </dl>
            </section>
          </div>
        )}
      />
    </div>
  );
}
