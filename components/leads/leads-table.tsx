import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DeleteLeadDialog } from "@/components/leads/delete-lead-dialog";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import type { LeadStatus } from "@/lib/constants/leads";

type LeadRow = {
  id: string;
  fullName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  source: string | null;
  createdAt: Date;
};

type LeadsTableProps = {
  leads: LeadRow[];
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function CellFallback({ value }: { value: string | null }) {
  return value ? (
    <span className="text-foreground">{value}</span>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
}

export function LeadsTable({ leads }: LeadsTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border bg-background shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
              <TableHead className="h-12 px-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Name
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Company
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Email
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Phone
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Source
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Created
              </TableHead>
              <TableHead className="w-[144px] px-6 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id} className="hover:bg-muted/20">
                <TableCell className="px-6 py-4 align-middle">
                  <div className="min-w-[180px]">
                    <p className="font-medium text-foreground">{lead.fullName}</p>
                  </div>
                </TableCell>

                <TableCell className="py-4 align-middle">
                  <div className="min-w-[140px]">
                    <CellFallback value={lead.company} />
                  </div>
                </TableCell>

                <TableCell className="py-4 align-middle">
                  <div className="min-w-[200px]">
                    <CellFallback value={lead.email} />
                  </div>
                </TableCell>

                <TableCell className="py-4 align-middle">
                  <div className="min-w-[140px]">
                    <CellFallback value={lead.phone} />
                  </div>
                </TableCell>

                <TableCell className="py-4 align-middle">
                  <LeadStatusBadge status={lead.status} />
                </TableCell>

                <TableCell className="py-4 align-middle">
                  <div className="min-w-[130px]">
                    <CellFallback value={lead.source} />
                  </div>
                </TableCell>

                <TableCell className="py-4 align-middle text-muted-foreground">
                  {formatDate(lead.createdAt)}
                </TableCell>

                <TableCell className="px-6 py-4 align-middle">
                  <div className="flex items-center justify-end gap-1">
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                      <Link href={`/dashboard/leads/${lead.id}`} aria-label="View lead">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>

                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                      <Link
                        href={`/dashboard/leads/${lead.id}/edit`}
                        aria-label="Edit lead"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>

                    <DeleteLeadDialog
                      leadId={lead.id}
                      leadName={lead.fullName}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}