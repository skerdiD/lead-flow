import { describe, expect, it } from "vitest";
import { dealFormSchema, dealMoveSchema } from "@/lib/validations/deal";

const validDeal = {
  name: "Website redesign",
  stage: "proposal",
  value: 2500,
  currency: "USD",
  probability: 60,
} as const;

describe("deal validation", () => {
  it("accepts only currencies from the centralized supported ISO list", () => {
    expect(dealFormSchema.safeParse(validDeal).success).toBe(true);
    expect(
      dealFormSchema.safeParse({ ...validDeal, currency: "ZZZ" }).success,
    ).toBe(false);
    expect(
      dealFormSchema.safeParse({ ...validDeal, currency: "usd" }).success,
    ).toBe(false);
  });

  it("requires and trims a lost reason", () => {
    expect(
      dealFormSchema.safeParse({ ...validDeal, stage: "lost" }).success,
    ).toBe(false);
    expect(
      dealMoveSchema.safeParse({
        dealId: "00000000-0000-4000-8000-000000000001",
        stage: "lost",
        updatedAt: "2026-08-05T10:00:00.000Z",
        lostReason: "   ",
      }).success,
    ).toBe(false);

    const parsed = dealFormSchema.parse({
      ...validDeal,
      stage: "lost",
      lostReason: "  Budget was withdrawn  ",
    });
    expect(parsed.lostReason).toBe("Budget was withdrawn");
  });
});
