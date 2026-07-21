import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { deals } from "@/db/schema";
import {
  canAccessRecord,
  type getWorkspaceAuthorizationContext,
} from "@/lib/authorization";
import type { DealStage } from "@/lib/constants/crm";
import { moneyToCents } from "@/lib/revenue";
import type { LeadDbClient } from "./db-client";
import {
  normalizeDealProbability,
  parseDateInput,
  resolveClosedAt,
} from "./lead-workflow-service";

export async function saveLeadDeal(params: {
  client?: LeadDbClient;
  workspaceId: string;
  userId: string;
  leadId: string;
  accountId?: string | null;
  contactId?: string | null;
  ownerUserId?: string | null;
  dealName?: string;
  dealStage: DealStage;
  dealValue: number;
  dealCurrency: string;
  dealProbability: number;
  expectedCloseDate?: string;
  closedDate?: string;
  lostReason?: string;
  authorizationContext?: ReturnType<typeof getWorkspaceAuthorizationContext>;
}) {
  const client = params.client ?? db;
  if (!params.dealName) return null;

  const dealProbability = normalizeDealProbability(
    params.dealStage,
    params.dealProbability,
  );
  const [existingDeal] = await client
    .select({
      id: deals.id,
      stage: deals.stage,
      closedAt: deals.closedAt,
      ownerUserId: deals.ownerUserId,
    })
    .from(deals)
    .where(
      and(
        eq(deals.leadId, params.leadId),
        eq(deals.workspaceId, params.workspaceId),
      ),
    )
    .limit(1);

  if (existingDeal) {
    if (
      params.authorizationContext &&
      !canAccessRecord(
        params.authorizationContext,
        {
          workspaceId: params.workspaceId,
          assignedUserId: existingDeal.ownerUserId,
        },
        "update",
      )
    ) {
      throw new Error(
        "This opportunity could not be found or you do not have permission to update it.",
      );
    }

    const [updatedDeal] = await client
      .update(deals)
      .set({
        accountId: params.accountId ?? null,
        contactId: params.contactId ?? null,
        ownerUserId: params.ownerUserId ?? null,
        name: params.dealName,
        stage: params.dealStage,
        valueCents: moneyToCents(params.dealValue),
        currency: params.dealCurrency,
        probability: dealProbability,
        expectedCloseAt: parseDateInput(params.expectedCloseDate),
        closedAt: resolveClosedAt({
          stage: params.dealStage,
          closedDate: params.closedDate,
          existingClosedAt: existingDeal.closedAt,
        }),
        lostReason: params.dealStage === "lost" ? params.lostReason ?? null : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(deals.id, existingDeal.id),
          eq(deals.workspaceId, params.workspaceId),
        ),
      )
      .returning({ id: deals.id, stage: deals.stage });

    return {
      id: updatedDeal?.id ?? existingDeal.id,
      previousStage: existingDeal.stage,
      stage: updatedDeal?.stage ?? params.dealStage,
    };
  }

  const [createdDeal] = await client
    .insert(deals)
    .values({
      workspaceId: params.workspaceId,
      userId: params.userId,
      ownerUserId: params.ownerUserId ?? null,
      leadId: params.leadId,
      accountId: params.accountId ?? null,
      contactId: params.contactId ?? null,
      name: params.dealName,
      stage: params.dealStage,
      valueCents: moneyToCents(params.dealValue),
      currency: params.dealCurrency,
      probability: dealProbability,
      expectedCloseAt: parseDateInput(params.expectedCloseDate),
      closedAt: resolveClosedAt({
        stage: params.dealStage,
        closedDate: params.closedDate,
      }),
      lostReason: params.dealStage === "lost" ? params.lostReason ?? null : null,
    })
    .returning({ id: deals.id, stage: deals.stage });

  return {
    id: createdDeal?.id ?? null,
    previousStage: null,
    stage: createdDeal?.stage ?? params.dealStage,
  };
}
