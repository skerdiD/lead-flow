import Papa from "papaparse";
import { IMPORT_LIMITS, normalizeHeader } from "@/lib/imports/config";

export class CsvImportError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "CsvImportError";
  }
}

export type ParsedCsv = {
  headers: string[];
  rows: Array<{ rowNumber: number; values: Record<string, string> }>;
};

const allowedMimeTypes = new Set([
  "",
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "text/plain",
]);

export function validateCsvFileMetadata(file: File) {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    throw new CsvImportError("Choose a CSV file with a .csv extension.");
  }
  if (!allowedMimeTypes.has(file.type.toLowerCase())) {
    throw new CsvImportError("The selected file is not a supported CSV file.");
  }
  if (file.size === 0) {
    throw new CsvImportError("The selected CSV file is empty.");
  }
  if (file.size > IMPORT_LIMITS.maxFileBytes) {
    throw new CsvImportError(
      `CSV files are limited to ${IMPORT_LIMITS.maxFileBytes / 1024 / 1024} MB.`,
      413,
    );
  }
}

export function decodeUtf8(bytes: ArrayBuffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new CsvImportError("The CSV must use valid UTF-8 encoding.");
  }
}

export function parseCsvText(text: string): ParsedCsv {
  if (!text.trim()) throw new CsvImportError("The selected CSV file is empty.");

  const result = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
  });

  const blockingErrors = result.errors.filter(
    (error) => error.code !== "UndetectableDelimiter",
  );
  if (blockingErrors.length > 0) {
    const first = blockingErrors[0];
    throw new CsvImportError(
      `The CSV could not be parsed${typeof first.row === "number" ? ` near row ${first.row + 1}` : ""}. Check quotes and delimiters.`,
    );
  }

  const matrix = result.data;
  const rawHeaders = matrix[0] ?? [];
  if (rawHeaders.length === 0 || rawHeaders.every((header) => !header.trim())) {
    throw new CsvImportError("The CSV must include a header row.");
  }
  if (rawHeaders.length > IMPORT_LIMITS.maxColumns) {
    throw new CsvImportError(
      `CSV files are limited to ${IMPORT_LIMITS.maxColumns} columns.`,
      413,
    );
  }

  const headers = rawHeaders.map((header) => header.replace(/^\uFEFF/, "").trim());
  if (headers.some((header) => !header)) {
    throw new CsvImportError("Every CSV column must have a header.");
  }

  const normalizedHeaders = headers.map(normalizeHeader);
  const duplicate = normalizedHeaders.find(
    (header, index) => normalizedHeaders.indexOf(header) !== index,
  );
  if (duplicate) {
    throw new CsvImportError("Duplicate CSV headers are not supported.");
  }

  const dataRows = matrix.slice(1);
  if (dataRows.length === 0) {
    throw new CsvImportError("The CSV does not contain any data rows.");
  }
  if (dataRows.length > IMPORT_LIMITS.maxRows) {
    throw new CsvImportError(
      `CSV files are limited to ${IMPORT_LIMITS.maxRows.toLocaleString()} data rows.`,
      413,
    );
  }

  const rows = dataRows.map((cells, rowIndex) => {
    if (cells.length > headers.length) {
      throw new CsvImportError(
        `Row ${rowIndex + 2} contains more values than the header row.`,
      );
    }

    const values: Record<string, string> = {};
    headers.forEach((header, columnIndex) => {
      const value = cells[columnIndex] ?? "";
      if (value.length > IMPORT_LIMITS.maxCellLength) {
        throw new CsvImportError(
          `Row ${rowIndex + 2}, column ${header} exceeds the ${IMPORT_LIMITS.maxCellLength.toLocaleString()} character limit.`,
          413,
        );
      }
      values[header] = value;
    });

    return { rowNumber: rowIndex + 2, values };
  });

  return { headers, rows };
}

export async function parseCsvFile(file: File) {
  validateCsvFileMetadata(file);
  return parseCsvText(decodeUtf8(await file.arrayBuffer()));
}

export function neutralizeSpreadsheetFormula(value: unknown) {
  const text = value == null ? "" : String(value);
  return /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
}

export function buildSafeCsv(rows: string[][]) {
  return Papa.unparse(
    rows.map((row) => row.map(neutralizeSpreadsheetFormula)),
    { newline: "\r\n" },
  );
}
