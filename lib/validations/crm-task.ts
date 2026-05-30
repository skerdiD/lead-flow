import { z } from "zod";
import { TASK_PRIORITIES } from "@/lib/constants/crm";

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

export const crmTaskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Please enter a task title.")
    .max(160, "Task title must be 160 characters or less."),
  description: optionalTrimmedString(1000),
  dueDate: optionalTrimmedString(10),
  priority: z.enum(TASK_PRIORITIES, {
    error: () => ({ message: "Please select a valid priority." }),
  }),
});

export type CrmTaskFormInput = z.input<typeof crmTaskFormSchema>;
export type CrmTaskFormValues = z.output<typeof crmTaskFormSchema>;
