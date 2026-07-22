import { describe, expect, it, vi } from "vitest";
import {
  buildSafeCsv,
  CsvImportError,
  parseCsvText,
  readCsvFile,
} from "@/lib/imports/csv";
import { IMPORT_LIMITS } from "@/lib/imports/config";

describe("CSV import parsing", () => {
  it("parses standard CSV rows and ignores empty rows", () => {
    const parsed = parseCsvText("Name,Email\r\nAva,ava@example.com\r\n\r\n");
    expect(parsed.headers).toEqual(["Name", "Email"]);
    expect(parsed.rows).toEqual([
      {
        rowNumber: 2,
        values: { Name: "Ava", Email: "ava@example.com" },
      },
    ]);
  });

  it("handles quoted commas, escaped quotes, and UTF-8 BOM", () => {
    const parsed = parseCsvText(
      '\uFEFFName,Notes\n"Ava, Moreno","Said ""hello"""\n',
    );
    expect(parsed.headers[0]).toBe("Name");
    expect(parsed.rows[0].values).toEqual({
      Name: "Ava, Moreno",
      Notes: 'Said "hello"',
    });
  });

  it("rejects duplicate or missing headers", () => {
    expect(() => parseCsvText("Email,e_mail\none,two")).toThrow(CsvImportError);
    expect(() => parseCsvText("Name,\nAva,one")).toThrow(
      "Every CSV column must have a header.",
    );
  });

  it("rejects excessive row and cell limits", () => {
    const rows = Array.from(
      { length: IMPORT_LIMITS.maxRows + 1 },
      (_, index) => `Lead ${index}`,
    );
    expect(() => parseCsvText(["Name", ...rows].join("\n"))).toThrow(
      /limited to/,
    );
    expect(() =>
      parseCsvText(`Name\n${"x".repeat(IMPORT_LIMITS.maxCellLength + 1)}`),
    ).toThrow(/character limit/);
  });

  it("returns a controlled error for malformed CSV", () => {
    expect(() => parseCsvText('Name,Notes\nAva,"unfinished')).toThrow(
      /could not be parsed/,
    );
  });

  it("reads upload bytes once so parsing and hashing can share the same payload", async () => {
    const bytes = new TextEncoder().encode("Name\nAva\n").buffer;
    const file = {
      name: "leads.csv",
      type: "text/csv",
      size: bytes.byteLength,
      arrayBuffer: vi.fn(async () => bytes),
    } as unknown as File;

    const result = await readCsvFile(file);

    expect(file.arrayBuffer).toHaveBeenCalledTimes(1);
    expect(result.parsed.rows).toHaveLength(1);
    expect(result.bytes).toBe(bytes);
  });

  it("neutralizes spreadsheet formulas in downloadable reports", () => {
    const csv = buildSafeCsv([
      ["Name", "Email"],
      ["=HYPERLINK(\"bad\")", "+person@example.com"],
      ["-1", "@command"],
    ]);
    expect(csv).toContain(`'=HYPERLINK`);
    expect(csv).toContain(`'+person@example.com`);
    expect(csv).toContain(`'-1`);
    expect(csv).toContain(`'@command`);
  });
});
