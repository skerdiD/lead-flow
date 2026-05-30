import {
  DEAL_STAGE_LABELS,
  type DealCurrency,
  type DealStage,
} from "@/lib/constants/crm";

export type RevenueDeal = {
  stage: DealStage;
  valueCents: number;
  probability: number;
  expectedCloseAt: Date | null;
  closedAt: Date | null;
  currency: DealCurrency | string;
};

export type PipelineStageRevenueDatum = {
  stage: DealStage;
  label: string;
  valueCents: number;
  weightedValueCents: number;
  deals: number;
};

export type RevenueSummary = {
  currency: string;
  totalPipelineValueCents: number;
  weightedPipelineValueCents: number;
  expectedRevenueThisMonthCents: number;
  wonRevenueCents: number;
  lostRevenueCents: number;
  pipelineByStage: PipelineStageRevenueDatum[];
};

const CLOSED_STAGES = new Set<DealStage>(["won", "lost"]);

export function moneyToCents(value: number) {
  return Math.round(value * 100);
}

export function centsToMoney(valueCents: number) {
  return valueCents / 100;
}

export function getMonthRange(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));

  return { start, end };
}

export function calculateWeightedValueCents(valueCents: number, probability: number) {
  return Math.round(valueCents * (probability / 100));
}

export function calculateRevenueSummary(
  deals: RevenueDeal[],
  currentDate = new Date(),
): RevenueSummary {
  const { start, end } = getMonthRange(currentDate);
  const currency = deals[0]?.currency ?? "USD";
  const stageMap = new Map<DealStage, PipelineStageRevenueDatum>();

  let totalPipelineValueCents = 0;
  let weightedPipelineValueCents = 0;
  let expectedRevenueThisMonthCents = 0;
  let wonRevenueCents = 0;
  let lostRevenueCents = 0;

  for (const deal of deals) {
    const valueCents = Math.max(0, deal.valueCents);
    const probability = Math.min(100, Math.max(0, deal.probability));
    const weightedValueCents = calculateWeightedValueCents(valueCents, probability);

    if (deal.stage === "won") {
      wonRevenueCents += valueCents;
    } else if (deal.stage === "lost") {
      lostRevenueCents += valueCents;
    } else {
      totalPipelineValueCents += valueCents;
      weightedPipelineValueCents += weightedValueCents;

      if (
        deal.expectedCloseAt &&
        deal.expectedCloseAt >= start &&
        deal.expectedCloseAt < end
      ) {
        expectedRevenueThisMonthCents += weightedValueCents;
      }
    }

    const existing =
      stageMap.get(deal.stage) ??
      {
        stage: deal.stage,
        label: DEAL_STAGE_LABELS[deal.stage],
        valueCents: 0,
        weightedValueCents: 0,
        deals: 0,
      };

    existing.valueCents += valueCents;
    existing.weightedValueCents += CLOSED_STAGES.has(deal.stage)
      ? valueCents
      : weightedValueCents;
    existing.deals += 1;
    stageMap.set(deal.stage, existing);
  }

  return {
    currency,
    totalPipelineValueCents,
    weightedPipelineValueCents,
    expectedRevenueThisMonthCents,
    wonRevenueCents,
    lostRevenueCents,
    pipelineByStage: Object.keys(DEAL_STAGE_LABELS).map((stage) => {
      const dealStage = stage as DealStage;

      return (
        stageMap.get(dealStage) ?? {
          stage: dealStage,
          label: DEAL_STAGE_LABELS[dealStage],
          valueCents: 0,
          weightedValueCents: 0,
          deals: 0,
        }
      );
    }),
  };
}

export function formatCurrencyFromCents(valueCents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: valueCents % 100 === 0 ? 0 : 2,
  }).format(centsToMoney(valueCents));
}
