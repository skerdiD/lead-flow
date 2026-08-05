import { z } from "zod";
import { DEAL_CURRENCIES } from "@/lib/constants/crm";

export const QUALIFICATION_DEAL_STAGES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
] as const;

const optionalText = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(max).optional(),
  );

const optionalUuid = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().uuid().optional(),
);

function isRealDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const optionalDate = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isRealDate).optional(),
);

export const leadQualificationSchema = z
  .object({
    requestKey: z.string().uuid(),
    accountMode: z.enum(["existing", "new"]),
    accountId: optionalUuid,
    accountName: optionalText(160),
    contactMode: z.enum(["existing", "new"]),
    contactId: optionalUuid,
    contactName: optionalText(120),
    contactEmail: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      z.string().trim().email().max(255).optional(),
    ),
    contactPhone: optionalText(32),
    contactTitle: optionalText(120),
    acknowledgeContactDuplicate: z.boolean().default(false),
    dealName: z.string().trim().min(2).max(160),
    dealValue: z.coerce.number().finite().min(0).max(100_000_000),
    dealCurrency: z.enum(DEAL_CURRENCIES),
    dealStage: z.enum(QUALIFICATION_DEAL_STAGES),
    dealProbability: z.coerce.number().int().min(0).max(100),
    expectedCloseDate: optionalDate,
    ownerUserId: z.string().trim().min(1).max(255),
  })
  .superRefine((value, context) => {
    if (value.accountMode === "existing" && !value.accountId) {
      context.addIssue({
        code: "custom",
        path: ["accountId"],
        message: "Select an account.",
      });
    }
    if (value.accountMode === "new" && !value.accountName) {
      context.addIssue({
        code: "custom",
        path: ["accountName"],
        message: "Enter an account name.",
      });
    }
    if (value.contactMode === "existing" && !value.contactId) {
      context.addIssue({
        code: "custom",
        path: ["contactId"],
        message: "Select a contact.",
      });
    }
    if (value.contactMode === "new" && !value.contactName) {
      context.addIssue({
        code: "custom",
        path: ["contactName"],
        message: "Enter a contact name.",
      });
    }
  });

export type LeadQualificationInput = z.input<typeof leadQualificationSchema>;
export type LeadQualificationValues = z.output<typeof leadQualificationSchema>;
