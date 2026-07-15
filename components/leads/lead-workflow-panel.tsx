"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Target } from "lucide-react";
import { toast } from "sonner";
import { updateLeadStatusQuickAction } from "@/app/dashboard/leads/actions";
import { DemoReadOnlyHint } from "@/components/demo/demo-read-only-hint";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/constants/leads";

type LeadWorkflowPanelProps = {
  leadId: string;
  fullName: string;
  currentStatus: LeadStatus;
  nextStep: string;
  readOnly?: boolean;
};

export function LeadWorkflowPanel({
  leadId,
  fullName,
  currentStatus,
  nextStep,
  readOnly = false,
}: LeadWorkflowPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>(currentStatus);

  const hasChanges = selectedStatus !== currentStatus;

  const handleApplyStatus = () => {
    if (!hasChanges) return;

    startTransition(async () => {
      const result = await updateLeadStatusQuickAction(leadId, selectedStatus);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <section id="lead-stage" className="rounded-3xl border bg-background p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">Pipeline status</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Update where {fullName} sits in the pipeline without leaving this page.
          </p>
        </div>
        <div className="rounded-full border bg-muted/20 px-2.5 py-1 text-xs font-medium text-muted-foreground">
          Next action
        </div>
      </div>

      <div className="mt-4 rounded-2xl border bg-muted/20 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Update stage
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:max-w-[220px]">
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as LeadStatus)}
              disabled={isPending || readOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleApplyStatus} disabled={isPending || !hasChanges || readOnly}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Apply stage
              </>
            )}
          </Button>
        </div>

        {readOnly ? (
          <DemoReadOnlyHint
            className="mt-4"
            message="Demo pipeline stages are locked so the sample dashboard and activity history stay consistent for every walkthrough."
          />
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl border bg-background p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Target className="h-4 w-4" />
          Suggested follow-up
        </p>
        <p className="mt-2 text-sm leading-6 text-foreground">{nextStep}</p>

        <Button asChild variant="outline" size="sm" className="mt-4">
          <a href="#lead-notes-input">Add follow-up note</a>
        </Button>
      </div>
    </section>
  );
}
