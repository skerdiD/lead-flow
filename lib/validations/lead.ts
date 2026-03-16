import { z } from "zod";
import { LEAD_STATUSES } from "@/lib/constants/leads";

const optionalTrimmedString = (max: number, emptyMessage?: string) =>
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

export const leadFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Please enter the lead’s full name.")
    .max(120, "Full name must be 120 characters or less."),
  company: optionalTrimmedString(160),
  email: optionalEmail,
  phone: optionalTrimmedString(32),
  status: z.enum(LEAD_STATUSES, {
    error: () => ({ message: "Please select a valid lead status." }),
  }),
  source: optionalTrimmedString(100),
  notes: optionalTrimmedString(5000),
});

export type LeadFormInput = z.input<typeof leadFormSchema>;
export type LeadFormValues = z.output<typeof leadFormSchema>;
