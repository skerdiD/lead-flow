import type { DealStage } from "@/lib/constants/crm";
import type { LeadStatus } from "@/lib/constants/leads";
import type { CrmTaskFormValues } from "@/lib/validations/crm-task";
import type {
  LeadFollowUpValues,
  LeadFormValues,
} from "@/lib/validations/lead";

export type LeadMutationState =
  | { success: true; leadId: string; message: string }
  | {
      success: false;
      message: string;
      fieldErrors?: Partial<Record<keyof LeadFormValues, string[]>>;
    };

export type DeleteLeadActionState =
  | { success: true; message: string }
  | { success: false; message: string };

export type BulkLeadActionState =
  | { success: true; message: string; affectedCount: number }
  | { success: false; message: string; affectedCount?: number };

export type LeadNoteMutationState =
  | { success: true; message: string }
  | {
      success: false;
      message: string;
      fieldErrors?: { content?: string[] };
    };

export type CrmTaskMutationState =
  | { success: true; message: string }
  | {
      success: false;
      message: string;
      fieldErrors?: Partial<Record<keyof CrmTaskFormValues, string[]>>;
    };

export type DealStageMutationState =
  | { success: true; message: string; stage: DealStage }
  | { success: false; message: string };

export type LeadQuickStatusState =
  | { success: true; message: string; status: LeadStatus }
  | { success: false; message: string };

export type LeadFollowUpMutationState =
  | { success: true; message: string }
  | {
      success: false;
      message: string;
      fieldErrors?: Partial<Record<keyof LeadFollowUpValues, string[]>>;
    };
