import type { importEntityTypes } from "@/db/schema";

export type ImportEntityType = (typeof importEntityTypes)[number];
export type DuplicateStrategy = "skip" | "update" | "create_new";

export const IMPORT_LIMITS = {
  maxFileBytes: 2 * 1024 * 1024,
  maxRows: 2_000,
  maxColumns: 60,
  maxCellLength: 5_000,
  previewPageSize: 25,
  batchSize: 100,
  stagedDataRetentionDays: 7,
} as const;

export type ImportField = {
  key: string;
  label: string;
  required?: boolean;
  description: string;
  aliases: readonly string[];
};

const sharedPersonFields: ImportField[] = [
  {
    key: "fullName",
    label: "Full name",
    required: true,
    description: "The person's display name. Use this or map First name.",
    aliases: ["full name", "name", "contact name", "lead name"],
  },
  {
    key: "firstName",
    label: "First name",
    description: "Combined with Last name when Full name is not mapped.",
    aliases: ["first name", "firstname", "given name", "first"],
  },
  {
    key: "lastName",
    label: "Last name",
    description: "Combined with First name when Full name is not mapped.",
    aliases: ["last name", "lastname", "surname", "family name", "last"],
  },
  {
    key: "email",
    label: "Email",
    description: "Normalized to lowercase.",
    aliases: ["email", "e-mail", "email address", "e-mail address", "work email"],
  },
  {
    key: "phone",
    label: "Phone",
    description: "Spacing is normalized while international prefixes are preserved.",
    aliases: ["phone", "phone number", "mobile", "mobile number", "telephone"],
  },
  {
    key: "assignedUserEmail",
    label: "Assigned team member",
    description: "Must match a member email in this workspace.",
    aliases: ["assigned to", "assignee", "owner", "owner email", "assigned user"],
  },
];

export const IMPORT_FIELDS: Record<ImportEntityType, readonly ImportField[]> = {
  lead: [
    ...sharedPersonFields,
    {
      key: "company",
      label: "Company",
      description: "Company text stored on the lead.",
      aliases: ["company", "company name", "organization", "organisation"],
    },
    {
      key: "accountName",
      label: "Linked account",
      description: "Matches an existing active account by exact normalized name.",
      aliases: ["account", "account name", "linked account"],
    },
    {
      key: "primaryContactEmail",
      label: "Primary contact email",
      description: "Matches one active contact in this workspace by email.",
      aliases: ["primary contact", "primary contact email", "contact email"],
    },
    {
      key: "status",
      label: "Status",
      description: "Defaults to New when empty.",
      aliases: ["status", "lead status", "pipeline status"],
    },
    {
      key: "source",
      label: "Source",
      description: "Where the lead originated.",
      aliases: ["source", "lead source", "origin", "channel"],
    },
    {
      key: "notes",
      label: "Notes",
      description: "Plain text notes, up to 5,000 characters.",
      aliases: ["notes", "note", "description", "comments"],
    },
    {
      key: "nextFollowUpDate",
      label: "Next follow-up date",
      description: "Accepted format: YYYY-MM-DD.",
      aliases: ["next follow up", "next follow-up", "follow up date", "follow-up date"],
    },
    {
      key: "followUpNote",
      label: "Follow-up note",
      description: "The next action or reminder context.",
      aliases: ["follow up note", "follow-up note", "next action"],
    },
    {
      key: "followUpPriority",
      label: "Follow-up priority",
      description: "Low, medium, or high.",
      aliases: ["follow up priority", "follow-up priority", "priority"],
    },
    {
      key: "followUpStatus",
      label: "Follow-up status",
      description: "Pending, completed, or rescheduled.",
      aliases: ["follow up status", "follow-up status"],
    },
  ],
  contact: [
    ...sharedPersonFields,
    {
      key: "title",
      label: "Job title",
      description: "The contact's role or title.",
      aliases: ["title", "job title", "role", "position"],
    },
    {
      key: "accountName",
      label: "Linked account",
      description: "Matches an existing active account by exact normalized name.",
      aliases: ["account", "account name", "company", "company name", "organization"],
    },
    {
      key: "isPrimary",
      label: "Primary contact",
      description: "Accepts yes/no, true/false, or 1/0.",
      aliases: ["primary", "is primary", "primary contact"],
    },
  ],
  account: [
    {
      key: "name",
      label: "Account name",
      required: true,
      description: "The company or organization name.",
      aliases: ["account", "account name", "name", "company", "company name", "organization"],
    },
    {
      key: "website",
      label: "Website",
      description: "A full URL beginning with http:// or https://.",
      aliases: ["website", "web site", "url", "company website"],
    },
    {
      key: "industry",
      label: "Industry",
      description: "The account's industry or market.",
      aliases: ["industry", "sector", "market"],
    },
    {
      key: "assignedUserEmail",
      label: "Assigned team member",
      description: "Must match a member email in this workspace.",
      aliases: ["assigned to", "assignee", "owner", "owner email", "assigned user"],
    },
  ],
};

export const IMPORT_ENTITY_DETAILS: Record<
  ImportEntityType,
  { label: string; pluralLabel: string; description: string; requiredText: string }
> = {
  lead: {
    label: "Lead",
    pluralLabel: "Leads",
    description: "Import prospects, pipeline status, source, ownership, and follow-up details.",
    requiredText: "Full name, or First name with an optional Last name.",
  },
  contact: {
    label: "Contact",
    pluralLabel: "Contacts",
    description: "Import people and optionally connect them to existing accounts.",
    requiredText: "Full name, or First name with an optional Last name.",
  },
  account: {
    label: "Account",
    pluralLabel: "Accounts",
    description: "Import companies with website, industry, and assigned owner details.",
    requiredText: "Account name.",
  },
};

export const IMPORT_TEMPLATES: Record<ImportEntityType, string[][]> = {
  lead: [
    ["Full Name", "Company", "Email", "Phone", "Status", "Lead Source", "Next Follow-up Date"],
    ["Jordan Lee", "Northstar Studio", "jordan@example.com", "+1 415 555 0123", "New", "Referral", "2026-08-15"],
  ],
  contact: [
    ["Full Name", "Email", "Phone", "Job Title", "Account Name", "Primary Contact"],
    ["Taylor Morgan", "taylor@example.com", "+44 20 7946 0958", "Operations Director", "Northstar Studio", "Yes"],
  ],
  account: [
    ["Account Name", "Website", "Industry", "Owner Email"],
    ["Northstar Studio", "https://northstar.example", "Professional Services", "owner@example.com"],
  ],
};

export function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function suggestMappings(
  entityType: ImportEntityType,
  headers: string[],
) {
  const fields = IMPORT_FIELDS[entityType];
  const aliasToField = new Map<string, string>();

  for (const field of fields) {
    aliasToField.set(normalizeHeader(field.label), field.key);
    aliasToField.set(normalizeHeader(field.key), field.key);
    for (const alias of field.aliases) {
      aliasToField.set(normalizeHeader(alias), field.key);
    }
  }

  const used = new Set<string>();
  return Object.fromEntries(
    headers.map((header) => {
      const suggestion = aliasToField.get(normalizeHeader(header)) ?? null;
      if (!suggestion || used.has(suggestion)) return [header, null];
      used.add(suggestion);
      return [header, suggestion];
    }),
  );
}

export function validateMapping(
  entityType: ImportEntityType,
  headers: string[],
  mapping: Record<string, string | null>,
) {
  const errors: string[] = [];
  const validFields = new Set(IMPORT_FIELDS[entityType].map((field) => field.key));
  const mappedFields = new Set<string>();

  for (const header of headers) {
    const field = mapping[header];
    if (!field) continue;
    if (!validFields.has(field)) {
      errors.push(`${header} is mapped to an unsupported field.`);
      continue;
    }
    if (mappedFields.has(field)) {
      errors.push(`${field} cannot be mapped more than once.`);
      continue;
    }
    mappedFields.add(field);
  }

  if (entityType === "account") {
    if (!mappedFields.has("name")) errors.push("Map a column to Account name.");
  } else if (!mappedFields.has("fullName") && !mappedFields.has("firstName")) {
    errors.push("Map a column to Full name or First name.");
  }

  return errors;
}
