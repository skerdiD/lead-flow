import { z } from "zod";
import type { ImportEntityType } from "@/lib/imports/config";
import { LEAD_STATUSES } from "@/lib/constants/leads";

export type ImportRowError = {
  field: string;
  value?: string;
  message: string;
};

const statusAliases = new Map(
  [
    ...LEAD_STATUSES.map((status) => [status.toLowerCase(), status] as const),
    ["proposal", "Proposal Sent"],
    ["proposal sent", "Proposal Sent"],
    ["qualified", "Interested"],
    ["open", "New"],
    ["won", "Closed"],
  ].map(([key, value]) => [normalizeToken(key), value] as const),
);
const followUpPriorityAliases = new Map([
  ["low", "low"],
  ["medium", "medium"],
  ["normal", "medium"],
  ["high", "high"],
] as const);
const followUpStatusAliases = new Map([
  ["pending", "pending"],
  ["open", "pending"],
  ["completed", "completed"],
  ["complete", "completed"],
  ["done", "completed"],
  ["rescheduled", "rescheduled"],
] as const);
const booleanAliases = new Map([
  ["true", true],
  ["yes", true],
  ["y", true],
  ["1", true],
  ["false", false],
  ["no", false],
  ["n", false],
  ["0", false],
] as const);

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function nullable(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function phone(value: string | undefined) {
  const trimmed = nullable(value);
  if (!trimmed) return null;
  return trimmed.replace(/[ \t]+/g, " ");
}

function date(value: string | undefined, field: string, errors: ImportRowError[]) {
  const trimmed = nullable(value);
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    errors.push({ field, value: trimmed, message: "Use YYYY-MM-DD." });
    return null;
  }
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== trimmed) {
    errors.push({ field, value: trimmed, message: "Enter a real calendar date." });
    return null;
  }
  return trimmed;
}

function mappedValue(
  raw: Record<string, string>,
  mapping: Record<string, string | null>,
  field: string,
) {
  const source = Object.entries(mapping).find(([, destination]) => destination === field)?.[0];
  return source ? raw[source] : undefined;
}

function personName(
  raw: Record<string, string>,
  mapping: Record<string, string | null>,
) {
  const fullName = nullable(mappedValue(raw, mapping, "fullName"));
  if (fullName) return fullName;
  return [nullable(mappedValue(raw, mapping, "firstName")), nullable(mappedValue(raw, mapping, "lastName"))]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function addZodErrors(
  result: z.ZodSafeParseResult<unknown>,
  errors: ImportRowError[],
) {
  if (result.success) return;
  for (const issue of result.error.issues) {
    errors.push({
      field: String(issue.path[0] ?? "row"),
      message: issue.message,
    });
  }
}

const personBase = {
  fullName: z.string().min(2, "Enter a name with at least 2 characters.").max(120),
  email: z.string().email("Email is invalid.").max(255).nullable(),
  phone: z.string().max(32, "Phone must be 32 characters or less.").nullable(),
  assignedUserEmail: z.string().email("Assigned user email is invalid.").max(255).nullable(),
};

const leadSchema = z.object({
  ...personBase,
  company: z.string().max(160).nullable(),
  accountName: z.string().max(160).nullable(),
  primaryContactEmail: z.string().email("Primary contact email is invalid.").max(255).nullable(),
  status: z.enum(LEAD_STATUSES),
  source: z.string().max(100).nullable(),
  notes: z.string().max(5_000).nullable(),
  nextFollowUpDate: z.string().nullable(),
  followUpNote: z.string().max(1_000).nullable(),
  followUpPriority: z.enum(["low", "medium", "high"]),
  followUpStatus: z.enum(["pending", "completed", "rescheduled"]),
});

const contactSchema = z.object({
  ...personBase,
  title: z.string().max(120).nullable(),
  accountName: z.string().max(160).nullable(),
  isPrimary: z.boolean(),
});

const accountSchema = z.object({
  name: z.string().min(2, "Enter an account name with at least 2 characters.").max(160),
  website: z
    .string()
    .max(255)
    .refine((value) => /^https?:\/\//i.test(value), "Website must start with http:// or https://.")
    .nullable(),
  industry: z.string().max(120).nullable(),
  assignedUserEmail: z.string().email("Assigned user email is invalid.").max(255).nullable(),
});

export function normalizeImportRow(
  entityType: ImportEntityType,
  raw: Record<string, string>,
  mapping: Record<string, string | null>,
) {
  const errors: ImportRowError[] = [];

  if (entityType === "lead") {
    const rawStatus = nullable(mappedValue(raw, mapping, "status"));
    const status = rawStatus ? statusAliases.get(normalizeToken(rawStatus)) : "New";
    if (!status) {
      errors.push({ field: "status", value: rawStatus ?? undefined, message: "Status is not supported." });
    }
    const rawPriority = nullable(mappedValue(raw, mapping, "followUpPriority"));
    const priority = rawPriority
      ? followUpPriorityAliases.get(normalizeToken(rawPriority) as "low")
      : "medium";
    if (!priority) {
      errors.push({ field: "followUpPriority", value: rawPriority ?? undefined, message: "Priority must be low, medium, or high." });
    }
    const rawFollowUpStatus = nullable(mappedValue(raw, mapping, "followUpStatus"));
    const followUpStatus = rawFollowUpStatus
      ? followUpStatusAliases.get(normalizeToken(rawFollowUpStatus) as "pending")
      : "pending";
    if (!followUpStatus) {
      errors.push({ field: "followUpStatus", value: rawFollowUpStatus ?? undefined, message: "Follow-up status is not supported." });
    }
    const normalized = {
      fullName: personName(raw, mapping),
      company: nullable(mappedValue(raw, mapping, "company")),
      email: nullable(mappedValue(raw, mapping, "email"))?.toLowerCase() ?? null,
      phone: phone(mappedValue(raw, mapping, "phone")),
      accountName: nullable(mappedValue(raw, mapping, "accountName")),
      primaryContactEmail:
        nullable(mappedValue(raw, mapping, "primaryContactEmail"))?.toLowerCase() ?? null,
      assignedUserEmail:
        nullable(mappedValue(raw, mapping, "assignedUserEmail"))?.toLowerCase() ?? null,
      status: status ?? "New",
      source: nullable(mappedValue(raw, mapping, "source")),
      notes: nullable(mappedValue(raw, mapping, "notes")),
      nextFollowUpDate: date(
        mappedValue(raw, mapping, "nextFollowUpDate"),
        "nextFollowUpDate",
        errors,
      ),
      followUpNote: nullable(mappedValue(raw, mapping, "followUpNote")),
      followUpPriority: priority ?? "medium",
      followUpStatus: followUpStatus ?? "pending",
    };
    addZodErrors(leadSchema.safeParse(normalized), errors);
    return { normalized, errors };
  }

  if (entityType === "contact") {
    const rawPrimary = nullable(mappedValue(raw, mapping, "isPrimary"));
    const isPrimary = rawPrimary
      ? booleanAliases.get(normalizeToken(rawPrimary) as "true")
      : false;
    if (typeof isPrimary !== "boolean") {
      errors.push({ field: "isPrimary", value: rawPrimary ?? undefined, message: "Use yes/no, true/false, or 1/0." });
    }
    const normalized = {
      fullName: personName(raw, mapping),
      email: nullable(mappedValue(raw, mapping, "email"))?.toLowerCase() ?? null,
      phone: phone(mappedValue(raw, mapping, "phone")),
      title: nullable(mappedValue(raw, mapping, "title")),
      accountName: nullable(mappedValue(raw, mapping, "accountName")),
      assignedUserEmail:
        nullable(mappedValue(raw, mapping, "assignedUserEmail"))?.toLowerCase() ?? null,
      isPrimary: isPrimary ?? false,
    };
    addZodErrors(contactSchema.safeParse(normalized), errors);
    return { normalized, errors };
  }

  const normalized = {
    name: nullable(mappedValue(raw, mapping, "name")) ?? "",
    website: nullable(mappedValue(raw, mapping, "website")),
    industry: nullable(mappedValue(raw, mapping, "industry")),
    assignedUserEmail:
      nullable(mappedValue(raw, mapping, "assignedUserEmail"))?.toLowerCase() ?? null,
  };
  addZodErrors(accountSchema.safeParse(normalized), errors);
  return { normalized, errors };
}

export function normalizedKey(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

export function duplicateKey(
  entityType: ImportEntityType,
  data: Record<string, unknown>,
) {
  if (entityType === "account") {
    return normalizedKey(data.name as string | null);
  }
  return normalizedKey(data.email as string | null);
}
