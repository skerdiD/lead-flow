import { z } from "zod";
import { DEAL_CURRENCIES, DEAL_STAGES } from "@/lib/constants/crm";

const optionalText = (max: number) => z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(max).optional(),
);

export const dealFormSchema = z.object({
  name: z.string().trim().min(2, "Enter a deal name.").max(160),
  stage: z.enum(DEAL_STAGES),
  value: z.coerce.number().min(0).max(100_000_000),
  currency: z.enum(DEAL_CURRENCIES),
  probability: z.coerce.number().int().min(0).max(100),
  expectedCloseDate: optionalText(10),
  leadId: optionalText(36),
  accountId: optionalText(36),
  contactId: optionalText(36),
  ownerUserId: optionalText(255),
  lostReason: optionalText(255),
});

export const dealMoveSchema = z.object({
  dealId: z.string().uuid(),
  stage: z.enum(DEAL_STAGES),
  updatedAt: z.string().datetime(),
  lostReason: optionalText(255),
});

export type DealFormValues = z.output<typeof dealFormSchema>;
