import { z } from "zod";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

export const contactFormSchema = z.object({
  fullName: z.string().trim().min(2, "Enter a contact name.").max(120),
  email: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().email("Enter a valid email address.").max(255).optional(),
  ),
  phone: optionalText(32),
  title: optionalText(120),
  accountId: optionalText(36),
  assignedOwnerUserId: optionalText(255),
  isPrimary: z.boolean().default(false),
});

export type ContactFormValues = z.output<typeof contactFormSchema>;
