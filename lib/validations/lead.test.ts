import { describe, expect, it } from "vitest";
import { leadFormSchema } from "@/lib/validations/lead";

describe("leadFormSchema", () => {
  it("trims and normalizes optional empty fields", () => {
    const result = leadFormSchema.parse({
      fullName: "  Jane Doe  ",
      company: "   ",
      email: "   ",
      phone: "   ",
      status: "New",
      source: "  referral  ",
      notes: "   ",
    });

    expect(result.fullName).toBe("Jane Doe");
    expect(result.company).toBeUndefined();
    expect(result.email).toBeUndefined();
    expect(result.phone).toBeUndefined();
    expect(result.notes).toBeUndefined();
    expect(result.source).toBe("referral");
    expect(result.dealValue).toBe(0);
    expect(result.dealProbability).toBe(10);
    expect(result.dealCurrency).toBe("USD");
  });

  it("rejects invalid status", () => {
    const parsed = leadFormSchema.safeParse({
      fullName: "Jane Doe",
      status: "invalid-status",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const parsed = leadFormSchema.safeParse({
      fullName: "Jane Doe",
      status: "New",
      email: "not-an-email",
    });

    expect(parsed.success).toBe(false);
  });

  it("validates deal value and probability", () => {
    const valid = leadFormSchema.parse({
      fullName: "Jane Doe",
      status: "New",
      dealValue: "1250.50",
      dealProbability: "45",
    });

    expect(valid.dealValue).toBe(1250.5);
    expect(valid.dealProbability).toBe(45);

    expect(
      leadFormSchema.safeParse({
        fullName: "Jane Doe",
        status: "New",
        dealValue: "-1",
      }).success,
    ).toBe(false);

    expect(
      leadFormSchema.safeParse({
        fullName: "Jane Doe",
        status: "New",
        dealProbability: "101",
      }).success,
    ).toBe(false);
  });

  it("rejects impossible deal dates", () => {
    expect(
      leadFormSchema.safeParse({
        fullName: "Jane Doe",
        status: "New",
        expectedCloseDate: "2026-99-99",
      }).success,
    ).toBe(false);

    expect(
      leadFormSchema.safeParse({
        fullName: "Jane Doe",
        status: "New",
        closedDate: "2026-02-31",
      }).success,
    ).toBe(false);
  });

  it("requires a reason for a linked deal marked lost", () => {
    const parsed = leadFormSchema.safeParse({
      fullName: "Jane Doe",
      status: "Lost",
      dealName: "Website redesign",
      dealStage: "lost",
      lostReason: "   ",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.lostReason).toContain(
        "Enter a reason before marking this deal as lost.",
      );
    }
  });
});
