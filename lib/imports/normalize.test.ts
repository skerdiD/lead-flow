import { describe, expect, it } from "vitest";
import {
  duplicateKey,
  normalizeImportRow,
} from "@/lib/imports/normalize";

describe("CSV import normalization and validation", () => {
  it("normalizes lead values through explicit aliases", () => {
    const result = normalizeImportRow(
      "lead",
      {
        Name: "  Ava Moreno ",
        Email: " AVA@EXAMPLE.COM ",
        Status: "proposal",
        Date: "2026-08-15",
      },
      {
        Name: "fullName",
        Email: "email",
        Status: "status",
        Date: "nextFollowUpDate",
      },
    );
    expect(result.errors).toEqual([]);
    expect(result.normalized).toMatchObject({
      fullName: "Ava Moreno",
      email: "ava@example.com",
      status: "Proposal Sent",
      nextFollowUpDate: "2026-08-15",
    });
  });

  it("reports invalid emails, unsupported statuses, dates, and booleans", () => {
    const lead = normalizeImportRow(
      "lead",
      { Name: "Ava Moreno", Email: "bad", Status: "Finished", Date: "08/15/2026" },
      { Name: "fullName", Email: "email", Status: "status", Date: "nextFollowUpDate" },
    );
    expect(lead.errors.map((error) => error.field)).toEqual(
      expect.arrayContaining(["email", "status", "nextFollowUpDate"]),
    );

    const contact = normalizeImportRow(
      "contact",
      { Name: "Taylor Morgan", Primary: "sometimes" },
      { Name: "fullName", Primary: "isPrimary" },
    );
    expect(contact.errors).toContainEqual(
      expect.objectContaining({ field: "isPrimary" }),
    );
  });

  it("combines first and last name and creates stable duplicate keys", () => {
    const result = normalizeImportRow(
      "contact",
      { First: "Taylor", Last: "Morgan", Email: " Taylor@Example.com " },
      { First: "firstName", Last: "lastName", Email: "email" },
    );
    expect((result.normalized as Record<string, unknown>).fullName).toBe(
      "Taylor Morgan",
    );
    expect(duplicateKey("contact", result.normalized)).toBe(
      "taylor@example.com",
    );
  });
});
