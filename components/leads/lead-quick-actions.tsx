"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CircleOff,
  Ellipsis,
  Loader2,
  PenSquare,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateDealStageAction,
  updateLeadStatusQuickAction,
} from "@/app/dashboard/leads/actions";
import {
  DeleteLeadDialog,
  RestoreLeadButton,
} from "@/components/leads/delete-lead-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LeadStatus } from "@/lib/constants/leads";
import {
  LeadQualificationDialog,
  type LeadQualificationSnapshot,
} from "@/components/leads/lead-qualification-dialog";

type LeadQuickActionsProps = {
  leadId: string;
  leadName: string;
  dealId: string | null;
  isArchived: boolean;
  currentStatus: LeadStatus;
  readOnly?: boolean;
  canDelete?: boolean;
  canUpdate?: boolean;
  canQualify?: boolean;
  qualificationLead?: LeadQualificationSnapshot;
};

export function LeadQuickActions({
  leadId,
  leadName,
  dealId,
  isArchived,
  currentStatus,
  readOnly = false,
  canDelete = false,
  canUpdate = false,
  canQualify = false,
  qualificationLead,
}: LeadQuickActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleTerminalUpdate = (target: "won" | "lost") => {
    startTransition(async () => {
      const result = dealId
        ? await updateDealStageAction(leadId, dealId, target)
        : await updateLeadStatusQuickAction(
            leadId,
            target === "won" ? "Closed" : "Lost",
          );

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(
        target === "won" ? "Lead marked as won." : "Lead marked as lost.",
      );
      router.refresh();
    });
  };

  const actionsDisabled = readOnly || !canUpdate || isArchived;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!actionsDisabled ? (
        <Button asChild size="sm" variant="outline">
          <a href="#notes">Add note</a>
        </Button>
      ) : null}

      {!actionsDisabled ? (
        <Button asChild size="sm" variant="outline">
          <a href="#overview">Schedule follow-up</a>
        </Button>
      ) : null}

      {canQualify && qualificationLead && !actionsDisabled ? (
        <LeadQualificationDialog lead={qualificationLead} disabled={isPending} />
      ) : null}

      {!actionsDisabled ? (
        <Button asChild size="sm">
          <Link href={`/dashboard/leads/${leadId}/edit`}>
            <PenSquare className="mr-2 h-4 w-4" />
            Edit lead
          </Link>
        </Button>
      ) : null}

      {!readOnly ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={isPending} aria-label="More lead actions">
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ellipsis className="h-4 w-4" />
                )}
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Lead actions</DropdownMenuLabel>
              <DropdownMenuItem disabled={actionsDisabled} onSelect={() => { window.location.hash = "overview"; }}>
                <Target className="mr-2 h-4 w-4" />
                Change stage or status
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { window.location.hash = "tasks"; }}>
                <Target className="mr-2 h-4 w-4" />
                View tasks
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={actionsDisabled || isPending || currentStatus === "Closed"}
                onSelect={() => handleTerminalUpdate("won")}
              >
                <BadgeCheck className="mr-2 h-4 w-4" />
                Mark as won
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={actionsDisabled || isPending || currentStatus === "Lost"}
                onSelect={() => handleTerminalUpdate("lost")}
              >
                <CircleOff className="mr-2 h-4 w-4" />
                Mark as lost
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {canDelete ? (
            isArchived ? (
              <RestoreLeadButton leadId={leadId} variant="button" />
            ) : (
              <DeleteLeadDialog leadId={leadId} leadName={leadName} variant="button" />
            )
          ) : null}
        </>
      ) : null}
    </div>
  );
}
