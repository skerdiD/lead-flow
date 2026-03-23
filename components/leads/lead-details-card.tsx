import Link from "next/link";
import {
  Building2,
  CalendarDays,
  Clock3,
  History,
  Mail,
  Pencil,
  Phone,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteLeadDialog } from "@/components/leads/delete-lead-dialog";
import { LeadNotesPanel } from "@/components/leads/lead-notes-panel";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { LeadWorkflowPanel } from "@/components/leads/lead-workflow-panel";

type LeadEventType =
  | "lead_created"
  | "lead_updated"
  | "lead_status_changed"
  | "lead_deleted"
  | "lead_note_added"
  | "lead_note_updated"
  | "lead_note_deleted";

type LeadDetails = {
  id: string;
  fullName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: "New" | "Contacted" | "Interested" | "Proposal Sent" | "Closed" | "Lost";
  source: string | null;
  notes: string | null;
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
    case "lead_note_added":
      return "Note added";
    case "lead_note_updated":
      return "Note updated";
    case "lead_note_deleted":
      return "Note deleted";
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
            </div>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Workflow view for this lead: update stage, capture notes, and track recent activity in one place.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border bg-muted/20 px-2.5 py-1">Source: {lead.source?.trim() || "Unspecified"}</span>
              <span className="rounded-full border bg-muted/20 px-2.5 py-1">Created {formatDateTime(lead.createdAt)}</span>
              <span className="rounded-full border bg-muted/20 px-2.5 py-1">Updated {formatDateTime(lead.updatedAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href={`/dashboard/leads/${lead.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>

            <DeleteLeadDialog leadId={lead.id} leadName={lead.fullName} variant="button" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-3xl border bg-background p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold tracking-tight text-foreground">Lead information</p>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailItem icon={<Building2 className="h-4 w-4" />} label="Company" value={lead.company} />
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
