import { describe, expect, it } from "vitest";
import { buildLeadsCsv, buildLeadsPdf } from "@/lib/leads-export";

const exportedAt = new Date("2026-06-03T10:00:00.000Z");

describe("lead exports", () => {
  it("escapes CSV cells and neutralizes spreadsheet formulas", () => {
    const csv = buildLeadsCsv(
      [
        {
          fullName: "=SUM(A1:A2)",
          company: "Acme, Inc.",
          email: "+finance@example.com",
          phone: null,
          status: "New",
          sourceLabel: "Website",
          createdAt: exportedAt,
        },
      ],
      {
        exportedAt,
        search: "alpha\nbeta",
        status: "New",
        source: "Website",
        totalCount: 1,
      },
    );

    expect(csv).toContain("'=SUM(A1:A2)");
    expect(csv).toContain("'+finance@example.com");
    expect(csv).toContain('"Acme, Inc."');
    expect(csv).toContain('"search=""alpha\nbeta"" | status=""New"" | source=""Website"""');
  });

  it("builds PDFs without failing on line breaks or non-ASCII input", async () => {
    const pdf = await buildLeadsPdf(
      [
        {
          fullName: "Mira\nNúñez",
          company: "Café Growth",
          email: "mira@example.com",
          phone: null,
          status: "Contacted",
          sourceLabel: "LinkedIn",
          createdAt: exportedAt,
        },
      ],
      {
        exportedAt,
        search: "Mira\nNúñez",
        status: "Contacted",
        source: "LinkedIn",
        totalCount: 1,
      },
    );

    expect(pdf.byteLength).toBeGreaterThan(0);
  });
});
