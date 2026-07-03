import { z } from "zod";
import {
  DEAL_CURRENCIES,
  DEAL_STAGES,
  DEFAULT_DEAL_CURRENCY,
} from "@/lib/constants/crm";
import {
  FOLLOW_UP_PRIORITIES,
  FOLLOW_UP_STATUSES,
  LEAD_STATUSES,
} from "@/lib/constants/leads";

const optionalTrimmedString = (max: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    z
      .string()
      .trim()
      .max(max, `Must be ${max} characters or less.`)
      .optional(),
  );

const optionalEmail = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .max(255, "Email must be 255 characters or less.")
    .optional(),
);

function isValidDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return false;

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const optionalDateString = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date.")
    .refine(isValidDateInput, "Please enter a valid date.")
    .optional(),
);

const optionalMoney = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? 0 : Number(trimmed);
    }

    return value ?? 0;
  },
  z
    .number()
    .finite("Please enter a valid deal value.")
    .min(0, "Deal value cannot be negative.")
    .max(100_000_000, "Deal value is too large.")
    .default(0),
);

const probabilityPercentage = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? 0 : Number(trimmed);
    }

    return value ?? 10;
  },
  z
    .number()
    .finite("Please enter a valid probability.")
    .int("Probability must be a whole number.")
    .min(0, "Probability cannot be less than 0%.")
    .max(100, "Probability cannot be more than 100%.")
    .default(10),
);

export const leadFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Please enter the lead's full name.")
    .max(120, "Full name must be 120 characters or less."),
  company: optionalTrimmedString(160),
  email: optionalEmail,
  phone: optionalTrimmedString(32),
  status: z.enum(LEAD_STATUSES, {
    error: () => ({ message: "Please select a valid lead status." }),
  }),
  source: optionalTrimmedString(100),
  notes: optionalTrimmedString(5000),
  nextFollowUpDate: optionalDateString,
  followUpNote: optionalTrimmedString(1000),
  followUpPriority: z.enum(FOLLOW_UP_PRIORITIES, {
    error: () => ({ message: "Please select a valid follow-up priority." }),
  }).default("medium"),
  followUpStatus: z.enum(FOLLOW_UP_STATUSES, {
    error: () => ({ message: "Please select a valid follow-up status." }),
  }).default("pending"),
  dealName: optionalTrimmedString(160),
  dealStage: z.enum(DEAL_STAGES, {
    error: () => ({ message: "Please select a valid deal stage." }),
  }).default("new"),
  dealValue: optionalMoney,
  dealCurrency: z.enum(DEAL_CURRENCIES).default(DEFAULT_DEAL_CURRENCY),
  dealProbability: probabilityPercentage,
  expectedCloseDate: optionalDateString,
  closedDate: optionalDateString,
  lostReason: optionalTrimmedString(255),
});

export type LeadFormInput = z.input<typeof leadFormSchema>;
export type LeadFormValues = z.output<typeof leadFormSchema>;
