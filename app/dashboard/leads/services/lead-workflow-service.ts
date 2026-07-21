import type { DealStage } from "@/lib/constants/crm";
import type { LeadStatus } from "@/lib/constants/leads";

export function parseDateInput(value?: string) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function reconcileLeadAndDealStage(
  status: LeadStatus,
  dealStage: DealStage,
) {
  if (dealStage === "won") return { status: "Closed" as LeadStatus, dealStage };
  if (dealStage === "lost") return { status: "Lost" as LeadStatus, dealStage };
  if (status === "Closed") return { status, dealStage: "won" as DealStage };
  if (status === "Lost") return { status, dealStage: "lost" as DealStage };

  return { status, dealStage };
}

export function leadStatusForDealStage(stage: DealStage): LeadStatus | null {
  if (stage === "won") return "Closed";
  if (stage === "lost") return "Lost";
  return null;
}

export function dealStageForLeadStatus(status: LeadStatus): DealStage | null {
  if (status === "Closed") return "won";
  if (status === "Lost") return "lost";
  return null;
}

export function resolveClosedAt(params: {
  stage: DealStage;
  closedDate?: string;
  existingClosedAt?: Date | null;
}) {
  const parsedClosedDate = parseDateInput(params.closedDate);
  if (parsedClosedDate) return parsedClosedDate;

  if (params.stage === "won" || params.stage === "lost") {
    return params.existingClosedAt ?? new Date();
  }

  return null;
}

export function normalizeDealProbability(stage: DealStage, probability: number) {
  if (stage === "won") return 100;
  if (stage === "lost") return 0;
  return probability;
}

export function formatActivityDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
