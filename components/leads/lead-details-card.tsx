import Link from "next/link";
import {
  Archive,
  Building2,
  CalendarDays,
  Clock3,
  History,
  Mail,
  Pencil,
  Phone,
  Radio,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteLeadDialog, RestoreLeadButton } from "@/components/leads/delete-lead-dialog";
import { LeadDealPanel } from "@/components/leads/lead-deal-panel";
import { LeadFollowUpBadge } from "@/components/leads/lead-follow-up-badge";
import { LeadNotesPanel } from "@/components/leads/lead-notes-panel";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { LeadTasksPanel } from "@/components/leads/lead-tasks-panel";
import { LeadWorkflowPanel } from "@/components/leads/lead-workflow-panel";
import type { DealStage, TaskPriority, TaskStatus } from "@/lib/constants/crm";
import type { FollowUpPriority, FollowUpStatus } from "@/lib/constants/leads";

type LeadEventType =
  | "lead_created"
  | "lead_updated"
  | "lead_status_changed"
  | "lead_deleted"
  | "lead_archived"
  | "lead_restored"
  | "lead_note_added"
  | "lead_note_updated"
  | "lead_note_deleted"
  | "task_created"
  | "task_completed"
  | "deal_stage_changed"
  | "lead_qualified";

type LeadDetails = {
  id: string;
  fullName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: "New" | "Contacted" | "Interested" | "Proposal Sent" | "Closed" | "Lost";
  source: string | null;
  notes: string | null;
  nextFollowUpDate: Date | null;
  followUpNote: string | null;
  followUpPriority: FollowUpPriority;
  followUpStatus: FollowUpStatus;
  isArchived: boolean;
  archivedAt: Date | null;
  assignedOwnerUserId: string | null;
  accountId: string | null;
  accountName: string | null;
  primaryContactId: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactPhone: string | null;
  dealEntry: {
    id: string;
    name: string;
    stage: DealStage;
    valueCents: number;
    currency: string;
    probability: number;
    expectedCloseAt: Date | null;
    closedAt: Date | null;
    lostReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  taskEntries: Array<{
    id: string;
    title: string;
    description: string | null;
    dueAt: Date | null;
    status: TaskStatus;
    priority: TaskPriority;
    completedAt: Date | null;
    createdAt: Date;
  }>;
  noteEntries: Array<{
    id: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  activityEntries: Array<{
    id: string;
    eventType: LeadEventType;
    message: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

type LeadDetailsCardProps = {
  lead: LeadDetails;
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

function getNextStep(status: LeadDetails["status"]) {
  switch (status) {
    case "New":
      return "Send first outreach today and capture response quality in a note.";
    case "Contacted":
      return "Book a qualification call and confirm timeline, budget, and decision maker.";
    case "Interested":
      return "Prepare a tailored proposal with clear scope and expected delivery window.";
    case "Proposal Sent":
      return "Set a follow-up date and track any objections before final decision.";
    case "Closed":
      return "Start onboarding checklist and log kickoff notes for a smooth handoff.";
    case "Lost":
      return "Record loss reason and set a re-engagement reminder for a later quarter.";
    default:
      return "Add a clear next step and date in notes to keep momentum.";
  }
}

function eventTypeLabel(eventType: LeadEventType) {
  switch (eventType) {
    case "lead_created":
      return "Lead created";
    case "lead_updated":
      return "Lead updated";
    case "lead_status_changed":
      return "Status changed";
    case "lead_deleted":
      return "Lead deleted";
    case "lead_archived":
      return "Lead archived";
    case "lead_restored":
      return "Lead restored";
    case "lead_note_added":
      return "Note added";
    case "lead_note_updated":
      return "Note updated";
    case "lead_note_deleted":
      return "Note deleted";
    case "task_created":
      return "Task created";
    case "task_completed":
      return "Task completed";
    case "deal_stage_changed":
      return "Deal stage changed";
    case "lead_qualified":
      return "Lead qualified";
    default:
      return "Activity";
  }
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">{value && value.trim() ? value : "-"}</p>
    </div>
  );
}

export function LeadDetailsCard({ lead }: LeadDetailsCardProps) {
  const nextStep = getNextStep(lead.status);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-background p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-3xl font-semibold tracking-tight text-foreground">{lead.fullName}</h1>
              <LeadStatusBadge status={lead.status} />
              {lead.isArchived ? (
                <Badge variant="outline" className="gap-1.5 border-muted-foreground/30 bg-muted/30 text-muted-foreground">
                  <Archive className="h-3.5 w-3.5" />
                  Archived
                </Badge>
              ) : null}
            </div>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Workflow view for this lead: update stage, capture notes, and track recent activity in one place.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border bg-muted/20 px-2.5 py-1">Source: {lead.source?.trim() || "Unspecified"}</span>
              <span className="rounded-full border bg-muted/20 px-2.5 py-1">Created {formatDateTime(lead.createdAt)}</span>
              <span className="rounded-full border bg-muted/20 px-2.5 py-1">Updated {formatDateTime(lead.updatedAt)}</span>
              {lead.archivedAt ? (
                <span className="rounded-full border bg-muted/20 px-2.5 py-1">Archived {formatDateTime(lead.archivedAt)}</span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href={`/dashboard/leads/${lead.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>

            {lead.isArchived ? (
              <RestoreLeadButton leadId={lead.id} variant="button" />
            ) : (
              <DeleteLeadDialog leadId={lead.id} leadName={lead.fullName} variant="button" />
            )}
          </div>
        </div>
      </section>

      {lead.isArchived ? (
        <section className="rounded-3xl border bg-muted/20 p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">Archived lead</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                This lead is hidden from active views. Notes, activity, tasks, and history are still saved.
              </p>
            </div>
            <RestoreLeadButton leadId={lead.id} variant="button" />
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-3xl border bg-background p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold tracking-tight text-foreground">Lead information</p>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailItem icon={<Building2 className="h-4 w-4" />} label="Account" value={lead.accountName ?? lead.company} />
            <DetailItem icon={<UserRound className="h-4 w-4" />} label="Primary contact" value={lead.primaryContactName ?? lead.fullName} />
            <DetailItem icon={<Mail className="h-4 w-4" />} label="Email" value={lead.email} />
            <DetailItem icon={<Phone className="h-4 w-4" />} label="Phone" value={lead.phone} />
            <DetailItem icon={<Radio className="h-4 w-4" />} label="Source" value={lead.source} />
            <DetailItem icon={<CalendarDays className="h-4 w-4" />} label="Created" value={formatDateTime(lead.createdAt)} />
            <DetailItem icon={<Clock3 className="h-4 w-4" />} label="Last updated" value={formatDateTime(lead.updatedAt)} />
          </div>
        </div>

        <LeadWorkflowPanel
          leadId={lead.id}
          fullName={lead.fullName}
          currentStatus={lead.status}
          nextStep={nextStep}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <LeadDealPanel leadId={lead.id} deal={lead.dealEntry} />
        <section className="space-y-4">
          <section className="rounded-3xl border bg-background p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold tracking-tight text-foreground">Follow-up reminder</p>
                <p className="mt-1 text-sm text-muted-foreground">The next planned touch for this lead.</p>
              </div>
              <LeadFollowUpBadge
                date={lead.nextFollowUpDate}
                note={lead.followUpNote}
                priority={lead.followUpPriority}
                status={lead.followUpStatus}
                compact
              />
            </div>

            <div className="mt-4 rounded-2xl border bg-muted/20 p-4">
              <p className="text-sm leading-6 text-foreground">
                {lead.followUpNote?.trim()
                  ? lead.followUpNote
                  : "No follow-up note has been added yet."}
              </p>
            </div>
          </section>

          <LeadTasksPanel leadId={lead.id} tasks={lead.taskEntries} />
        </section>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-3xl border bg-background p-6 shadow-sm">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">Profile notes</p>
              <p className="mt-1 text-sm text-muted-foreground">Static context saved directly on this lead profile.</p>
            </div>

            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                {lead.notes && lead.notes.trim() ? lead.notes : "No profile notes have been added yet."}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border bg-background p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">Recent activity</p>
              <p className="mt-1 text-sm text-muted-foreground">Latest timeline events for this lead.</p>
            </div>
            <History className="h-4 w-4 text-muted-foreground" />
          </div>

          {lead.activityEntries.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
              No activity yet. Your updates and notes will appear here.
            </div>
          ) : (
            <ol className="space-y-3">
              {lead.activityEntries.map((entry) => (
                <li key={entry.id} className="rounded-2xl border bg-background p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border bg-muted/20 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {eventTypeLabel(entry.eventType)}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-foreground">{entry.message}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </section>

      <LeadNotesPanel leadId={lead.id} notes={lead.noteEntries} />
    </div>
  );
}
