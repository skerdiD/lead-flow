import { describe, expect, it } from "vitest";
import { crmTaskFormSchema } from "@/lib/validations/crm-task";

describe("crmTaskFormSchema", () => {
  it("accepts empty or yyyy-mm-dd due dates", () => {
    expect(
      crmTaskFormSchema.parse({
        title: "Send proposal",
        dueDate: "2026-06-03",
        priority: "high",
      }).dueDate,
    ).toBe("2026-06-03");

    expect(
      crmTaskFormSchema.parse({
        title: "Send proposal",
        dueDate: "   ",
        priority: "medium",
      }).dueDate,
    ).toBeUndefined();
  });

  it("rejects invalid due date formats", () => {
    expect(
      crmTaskFormSchema.safeParse({
        title: "Send proposal",
        dueDate: "06/03/2026",
        priority: "high",
      }).success,
    ).toBe(false);

    expect(
      crmTaskFormSchema.safeParse({
        title: "Send proposal",
        dueDate: "2026-02-31",
        priority: "high",
      }).success,
    ).toBe(false);
  });
});
