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
});
