"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Target } from "lucide-react";
import { toast } from "sonner";
import { updateDealStageAction } from "@/app/dashboard/leads/actions";
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGES,
  type DealStage,
} from "@/lib/constants/crm";
import { formatCurrencyFromCents } from "@/lib/revenue";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LeadDealPanelProps = {
  leadId: string;
  deal: {
    id: string;
    name: string;
    stage: DealStage;
    valueCents: number;
    currency: string;
    probability: number;
    expectedCloseAt: Date | null;
    closedAt: Date | null;
    lostReason: string | null;
    updatedAt: Date;
  } | null;
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

function formatDate(date: Date | null) {
  if (!date) return "Not set";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function LeadDealPanel({ leadId, deal }: LeadDealPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [stage, setStage] = useState<DealStage>(deal?.stage ?? "new");

  if (!deal) {
    return (
      <section className="rounded-3xl border bg-background p-5 shadow-sm">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Opportunity
        </p>
        <div className="mt-4 rounded-2xl border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          No deal is linked yet. Add one from the lead edit form when this becomes a sales opportunity.
        </div>
      </section>
    );
  }

  const hasChanges = stage !== deal.stage;

  const handleUpdateStage = () => {
    if (!hasChanges) return;

    startTransition(async () => {
      const result = await updateDealStageAction(leadId, deal.id, stage);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <section className="rounded-3xl border bg-background p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">
            Opportunity
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{deal.name}</p>
        </div>
        <Target className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-background p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Value
          </p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {formatCurrencyFromCents(deal.valueCents, deal.currency)}
          </p>
        </div>
        <div className="rounded-2xl border bg-background p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Probability
          </p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {deal.probability}%
          </p>
        </div>
        <div className="rounded-2xl border bg-background p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Expected close
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {formatDate(deal.expectedCloseAt)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border bg-muted/20 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Deal stage
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:max-w-[220px]">
            <Select
              value={stage}
              onValueChange={(value) => setStage(value as DealStage)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEAL_STAGES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {DEAL_STAGE_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleUpdateStage} disabled={isPending || !hasChanges}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Apply stage
          </Button>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {deal.closedAt ? `Closed ${formatDate(deal.closedAt)} · ` : ""}
        Last updated {formatDateTime(deal.updatedAt)}
      </p>
      {deal.lostReason ? (
        <p className="mt-2 rounded-2xl border bg-muted/20 p-3 text-sm text-muted-foreground">
          Lost reason: {deal.lostReason}
        </p>
      ) : null}
    </section>
  );
}
