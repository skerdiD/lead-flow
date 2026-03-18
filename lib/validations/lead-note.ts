import { z } from "zod";

export const leadNoteSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Please enter a note.")
    .max(2000, "Notes must be 2000 characters or less."),
});

export type LeadNoteInput = z.input<typeof leadNoteSchema>;
export type LeadNoteValues = z.output<typeof leadNoteSchema>;
