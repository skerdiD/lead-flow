import { z } from "zod";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

export const accountFormSchema = z.object({
  name: z.string().trim().min(2, "Enter an account name.").max(160),
  website: optionalText(255).refine(
    (value) => !value || /^https?:\/\//i.test(value),
    "Use a full website URL starting with http:// or https://.",
  ),
  industry: optionalText(120),
  assignedOwnerUserId: optionalText(255),
});

export type AccountFormValues = z.output<typeof accountFormSchema>;
