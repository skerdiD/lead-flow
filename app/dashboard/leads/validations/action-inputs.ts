import { z } from "zod";
import { DEAL_STAGES } from "@/lib/constants/crm";
import type { DealStage } from "@/lib/constants/crm";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/constants/leads";
import { isUuid, normalizeUuidList } from "@/lib/uuid";

export const leadActionIdSchema = z.string().refine(isUuid);
export const leadStatusActionSchema = z.enum(LEAD_STATUSES);
export const dealStageActionSchema = z.enum(DEAL_STAGES);

export function isLeadActionId(value: string) {
  return leadActionIdSchema.safeParse(value).success;
}

export function isLeadStatusActionValue(value: string): value is LeadStatus {
  return leadStatusActionSchema.safeParse(value).success;
}

export function isDealStageActionValue(value: string): value is DealStage {
  return dealStageActionSchema.safeParse(value).success;
}

export function parseBulkLeadIds(leadIds: string[]) {
  return normalizeUuidList(leadIds, 200);
}
