import { z } from "zod";
import { LEAD_STATUSES } from "@/lib/constants/leads";

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, schema.optional());

export const createLeadSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(120, "Full name must be 120 characters or less."),
  company: emptyStringToUndefined(
    z.string().trim().max(160, "Company must be 160 characters or less."),
  ),
  email: emptyStringToUndefined(
    z.email("Enter a valid email address."),
  ),
  phone: emptyStringToUndefined(
    z.string().trim().max(32, "Phone must be 32 characters or less."),
  ),
  status: z.enum(LEAD_STATUSES, {
    error: "Please select a valid status.",
  }),
  source: emptyStringToUndefined(
    z.string().trim().max(100, "Source must be 100 characters or less."),
  ),
  notes: emptyStringToUndefined(
    z.string().trim().max(5000, "Notes must be 5000 characters or less."),
  ),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;