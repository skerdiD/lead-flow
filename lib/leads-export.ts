import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type LeadExportItem = {
  fullName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  sourceLabel: string;
  createdAt: Date;
};

export type LeadExportMetadata = {
  exportedAt: Date;
  search: string;
  status: string;
  source: string;
  totalCount: number;
  selectedCount?: number;
};

function toReadableTimestamp(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toCsvDate(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function escapeCsvValue(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function toDisplayValue(value: string | null) {
  return value?.trim() || "-";
}

export function buildLeadsCsv(
  rows: LeadExportItem[],
  metadata: LeadExportMetadata,
) {
  const headerLines = [
    `LeadFlow Leads Export`,
    `Exported At,${escapeCsvValue(toReadableTimestamp(metadata.exportedAt))}`,
    `Total Leads,${metadata.totalCount}`,
    `Filters,search="${metadata.search || "-"}" | status="${metadata.status || "All"}" | source="${metadata.source || "All"}"`,
  ];

  if (metadata.selectedCount && metadata.selectedCount > 0) {
    headerLines.push(`Selection,${metadata.selectedCount} selected lead(s)`);
  }

  const columnHeaders = [
    "Name",
    "Company",
    "Email",
    "Phone",
    "Status",
    "Source",
    "Created At",
  ];

  const dataLines = rows.map((lead) =>
    [
      lead.fullName,
      toDisplayValue(lead.company),
      toDisplayValue(lead.email),
      toDisplayValue(lead.phone),
      lead.status,
      lead.sourceLabel,
      toCsvDate(lead.createdAt),
    ]
      .map((value) => escapeCsvValue(value))
      .join(","),
  );

  return `${headerLines.join("\n")}\n\n${columnHeaders.join(",")}\n${dataLines.join("\n")}\n`;
}

export async function buildLeadsPdf(
  rows: LeadExportItem[],
  metadata: LeadExportMetadata,
) {
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageSize: [number, number] = [842, 595];
  const marginX = 40;
  const marginTop = 42;
  const marginBottom = 40;
  const lineHeight = 15;

  let page = pdfDoc.addPage(pageSize);
  let y = page.getHeight() - marginTop;

  const addPage = () => {
    page = pdfDoc.addPage(pageSize);
    y = page.getHeight() - marginTop;
  };

  const ensureSpace = (height: number) => {
    if (y - height < marginBottom) {
      addPage();
    }
  };

  const drawText = (
    text: string,
    options?: {
      size?: number;
      bold?: boolean;
      color?: { r: number; g: number; b: number };
      x?: number;
    },
  ) => {
    page.drawText(text, {
      x: options?.x ?? marginX,
      y,
      size: options?.size ?? 10,
      font: options?.bold ? boldFont : regularFont,
      color: options?.color ? rgb(options.color.r, options.color.g, options.color.b) : rgb(0.1, 0.12, 0.16),
    });
  };

  drawText("LeadFlow Leads Report", { size: 18, bold: true, color: { r: 0.08, g: 0.15, b: 0.35 } });
  y -= 22;
  drawText(`Exported: ${toReadableTimestamp(metadata.exportedAt)}`, { size: 10 });
  y -= lineHeight;
  drawText(
    `Filters: search="${metadata.search || "-"}" | status="${metadata.status || "All"}" | source="${metadata.source || "All"}"`,
    { size: 10 },
  );
  y -= lineHeight;
  drawText(`Leads included: ${metadata.totalCount}`, { size: 10 });

  if (metadata.selectedCount && metadata.selectedCount > 0) {
    y -= lineHeight;
    drawText(`Selected leads export: ${metadata.selectedCount}`, { size: 10 });
  }

  y -= 20;
  drawText("Lead Details", { size: 12, bold: true });
  y -= 16;

  rows.forEach((lead, index) => {
    ensureSpace(56);

    drawText(`${index + 1}. ${lead.fullName}`, { size: 11, bold: true });
    y -= lineHeight;
    drawText(
      `Company: ${toDisplayValue(lead.company)} | Status: ${lead.status} | Source: ${lead.sourceLabel}`,
      { size: 9 },
    );
    y -= lineHeight;
    drawText(
      `Email: ${toDisplayValue(lead.email)} | Phone: ${toDisplayValue(lead.phone)} | Created: ${toReadableTimestamp(lead.createdAt)}`,
      { size: 9 },
    );
    y -= 12;
    page.drawLine({
      start: { x: marginX, y },
      end: { x: page.getWidth() - marginX, y },
      thickness: 0.5,
      color: rgb(0.85, 0.87, 0.9),
    });
    y -= 14;
  });

  return pdfDoc.save();
}
