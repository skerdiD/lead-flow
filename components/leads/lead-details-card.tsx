import Link from "next/link";
import {
  Building2,
  CalendarDays,
  Clock3,
  Mail,
  Pencil,
  Phone,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteLeadDialog } from "@/components/leads/delete-lead-dialog";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";

type LeadDetails = {
  id: string;
  fullName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: "New" | "Contacted" | "Interested" | "Proposal Sent" | "Closed" | "Lost";
  source: string | null;
  notes: string | null;
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
      <p className="mt-3 text-sm text-foreground">
        {value && value.trim() ? value : "—"}
      </p>
    </div>
  );
}

export function LeadDetailsCard({ lead }: LeadDetailsCardProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-background p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-3xl font-semibold tracking-tight text-foreground">
                {lead.fullName}
              </h1>
              <LeadStatusBadge status={lead.status} />
            </div>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Review contact details, source, notes, and the latest status for this lead.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href={`/dashboard/leads/${lead.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <DeleteLeadDialog
              leadId={lead.id}
              leadName={lead.fullName}
              variant="button"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DetailItem
          icon={<Building2 className="h-4 w-4" />}
          label="Company"
          value={lead.company}
        />
        <DetailItem
          icon={<Mail className="h-4 w-4" />}
          label="Email"
          value={lead.email}
        />
        <DetailItem
          icon={<Phone className="h-4 w-4" />}
          label="Phone"
          value={lead.phone}
        />
        <DetailItem
          icon={<Radio className="h-4 w-4" />}
          label="Source"
          value={lead.source}
        />
        <DetailItem
          icon={<CalendarDays className="h-4 w-4" />}
          label="Created"
          value={formatDateTime(lead.createdAt)}
        />
        <DetailItem
          icon={<Clock3 className="h-4 w-4" />}
          label="Last updated"
          value={formatDateTime(lead.updatedAt)}
        />
      </section>

      <section className="rounded-3xl border bg-background p-6 shadow-sm">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              Notes
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Internal context and follow-up details for this lead.
            </p>
          </div>

          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
              {lead.notes && lead.notes.trim()
                ? lead.notes
                : "No notes have been added yet."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}