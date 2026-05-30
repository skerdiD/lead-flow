import { describe, expect, it } from "vitest";
import {
  calculateRevenueSummary,
  calculateWeightedValueCents,
  moneyToCents,
} from "@/lib/revenue";

describe("revenue calculations", () => {
  it("converts money to cents and calculates weighted value", () => {
    expect(moneyToCents(1234.56)).toBe(123456);
    expect(calculateWeightedValueCents(100000, 35)).toBe(35000);
  });

  it("calculates pipeline, forecast, won, lost, and stage totals", () => {
    const summary = calculateRevenueSummary(
      [
        {
          stage: "proposal",
          valueCents: 100000,
          probability: 50,
          expectedCloseAt: new Date("2026-05-15T00:00:00.000Z"),
          closedAt: null,
          currency: "USD",
        },
        {
          stage: "qualified",
          valueCents: 200000,
          probability: 25,
          expectedCloseAt: new Date("2026-06-01T00:00:00.000Z"),
          closedAt: null,
          currency: "USD",
        },
        {
          stage: "won",
          valueCents: 300000,
          probability: 100,
          expectedCloseAt: null,
          closedAt: new Date("2026-05-10T00:00:00.000Z"),
          currency: "USD",
        },
        {
          stage: "lost",
          valueCents: 400000,
          probability: 0,
          expectedCloseAt: null,
          closedAt: new Date("2026-05-11T00:00:00.000Z"),
          currency: "USD",
        },
      ],
      new Date("2026-05-30T12:00:00.000Z"),
    );

    expect(summary.totalPipelineValueCents).toBe(300000);
    expect(summary.weightedPipelineValueCents).toBe(100000);
    expect(summary.expectedRevenueThisMonthCents).toBe(50000);
    expect(summary.wonRevenueCents).toBe(300000);
    expect(summary.lostRevenueCents).toBe(400000);
    expect(summary.pipelineByStage.find((item) => item.stage === "proposal")).toMatchObject({
      valueCents: 100000,
      weightedValueCents: 50000,
      deals: 1,
    });
  });
});
