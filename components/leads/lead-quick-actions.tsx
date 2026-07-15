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

type LeadQuickActionsProps = {
  leadId: string;
  leadName: string;
  dealId: string | null;
  isArchived: boolean;
  currentStatus: LeadStatus;
  readOnly?: boolean;
  canDelete?: boolean;
};

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function LeadQuickActions({
  leadId,
  leadName,
  dealId,
  isArchived,
  currentStatus,
  readOnly = false,
  canDelete = false,
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild size="sm" variant="outline">
        <a href="#lead-note-editor">{readOnly ? "View notes" : "Add note"}</a>
      </Button>

      <Button asChild size="sm" variant="outline">
        <a href="#lead-follow-up">{readOnly ? "View follow-up" : "Schedule follow-up"}</a>
      </Button>

      {!readOnly ? (
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
              <Button size="sm" variant="outline" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ellipsis className="h-4 w-4" />
                )}
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Lead actions</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => scrollToSection("lead-stage")}>
                <Target className="mr-2 h-4 w-4" />
                Change stage or status
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => scrollToSection("lead-tasks")}>
                <Target className="mr-2 h-4 w-4" />
                Jump to tasks
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isPending || currentStatus === "Closed"}
                onSelect={() => handleTerminalUpdate("won")}
              >
                <BadgeCheck className="mr-2 h-4 w-4" />
                Mark as won
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isPending || currentStatus === "Lost"}
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
