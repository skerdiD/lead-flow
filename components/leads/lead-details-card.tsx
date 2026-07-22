import Link from "next/link";
import type { ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  CheckCheck,
  Clock3,
  History,
  Mail,
  Phone,
  Radio,
  UserRound,
} from "lucide-react";
import type { LeadDetailsResult } from "@/app/dashboard/leads/[id]/queries";
import { DemoReadOnlyHint } from "@/components/demo/demo-read-only-hint";
import { LeadDealPanel } from "@/components/leads/lead-deal-panel";
import { LeadFollowUpBadge } from "@/components/leads/lead-follow-up-badge";
import { LeadFollowUpPanel } from "@/components/leads/lead-follow-up-panel";
import { LeadNotesPanel } from "@/components/leads/lead-notes-panel";
import { LeadQuickActions } from "@/components/leads/lead-quick-actions";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { LeadTasksPanel } from "@/components/leads/lead-tasks-panel";
import { LeadWorkflowPanel } from "@/components/leads/lead-workflow-panel";
import { Badge } from "@/components/ui/badge";
import { DEAL_STAGE_LABELS } from "@/lib/constants/crm";
import { formatCurrencyFromCents } from "@/lib/revenue";
import { groupTasksByTimeline } from "@/lib/tasks";

type LeadDetailsCardProps = {
  lead: LeadDetailsResult;
  readOnly?: boolean;
  canManageAllCrm?: boolean;
  canDelete?: boolean;
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

  return (
    <div
      className="mx-auto w-full max-w-[1440px] space-y-6"
      data-testid="lead-details-page"
    >
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-muted/35 p-6 shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-4xl">
              <p className="inline-flex items-center rounded-full border bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Lead workspace
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <h1 className="leadflow-page-title min-w-0 text-foreground sm:text-4xl">
                  {lead.fullName}
                </h1>
                <LeadStatusBadge status={lead.status} />
                <Badge variant="outline" className="bg-background/80">
                  Source: {lead.source?.trim() || "Unspecified"}
                </Badge>
                <Badge variant="outline" className="bg-background/80">
                  {dealStageLabel}
                </Badge>
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
                  <CalendarDays className="h-4 w-4" />
                  Created {formatDate(lead.createdAt)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  Updated {formatDateTime(lead.updatedAt)}
                </span>
              </div>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                Understand the relationship, move the pipeline forward, and capture every next step from one focused CRM workspace.
              </p>
            </div>

            <LeadQuickActions
              leadId={lead.id}
              leadName={lead.fullName}
              dealId={lead.dealEntry?.id ?? null}
              isArchived={lead.isArchived}
              currentStatus={lead.status}
              readOnly={readOnly}
              canDelete={canDelete}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Deal value"
              value={dealValue}
              helper={lead.dealEntry ? `${dealStageLabel} opportunity` : "Add an opportunity when this lead becomes active pipeline"}
            />
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

      <section
        className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,380px)] xl:gap-6"
        data-testid="lead-details-content-grid"
      >
        <div
          className="order-2 min-w-0 space-y-5 xl:order-1"
          data-testid="lead-details-main"
        >
          <section
            className="rounded-3xl border bg-background p-5 shadow-sm sm:p-6"
            data-testid="lead-context-section"
          >
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

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <DetailItem
                icon={<Building2 className="h-4 w-4" />}
                label="Company"
                value={companyName}
              />
              <DetailItem
                icon={<UserRound className="h-4 w-4" />}
                label="Primary contact"
                value={lead.primaryContactName?.trim() || lead.fullName}
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
                label="Workspace owner"
                value={lead.assignedOwnerUserId === lead.viewerUserId ? "You" : "Assigned teammate"}
              />
            </div>
          </section>

          <section
            className="rounded-3xl border bg-background p-5 shadow-sm sm:p-6"
            data-testid="lead-profile-context-section"
          >
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Profile context
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Persistent background saved on the lead record itself.
              </p>
            </div>

            <div className="mt-5 rounded-2xl border bg-muted/20 p-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                {lead.notes?.trim()
                  ? lead.notes
                  : "No profile context has been added yet. Use the editable notes section below for live conversation notes and decisions."}
              </p>
            </div>
          </section>

          <LeadTasksPanel leadId={lead.id} tasks={lead.taskEntries} readOnly={readOnly} canDelete={canDelete} />
        </div>

        <aside
          aria-label="Lead actions and opportunity"
          className="order-1 min-w-0 space-y-5 xl:order-2"
          data-testid="lead-details-sidebar"
        >
          <LeadWorkflowPanel
            leadId={lead.id}
            fullName={lead.fullName}
            currentStatus={lead.status}
            nextStep={nextStep}
            readOnly={readOnly}
          />
          <LeadFollowUpPanel
            key={`${lead.nextFollowUpDate?.toISOString() ?? "none"}:${lead.followUpPriority}:${lead.followUpStatus}:${lead.followUpNote ?? ""}`}
            leadId={lead.id}
            followUp={{
              date: lead.nextFollowUpDate,
              note: lead.followUpNote,
              priority: lead.followUpPriority,
              status: lead.followUpStatus,
            }}
            readOnly={readOnly}
          />
          <LeadDealPanel leadId={lead.id} deal={lead.dealEntry} readOnly={readOnly} />
        </aside>
      </section>

      <section
        className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:gap-6"
        data-testid="lead-details-history-grid"
      >
        <LeadNotesPanel
          leadId={lead.id}
          notes={lead.noteEntries}
          currentUserId={lead.viewerUserId}
          readOnly={readOnly}
          canManageAllNotes={canManageAllCrm}
          canDeleteNotes={canDelete}
        />

        <section
          id="lead-activity"
          className="rounded-3xl border bg-background p-5 shadow-sm sm:p-6"
        >
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
      </section>
    </div>
  );
}
