"use server";

import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  contacts,
  deals,
  leads,
  workspaceMembers,
} from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import {
  getRecordUpdateConditions,
  getRecordVisibilityConditions,
  getWorkspaceAuthorizationContext,
  hasWorkspacePermission,
} from "@/lib/authorization";
import { writeAuditEvent } from "@/lib/audit-log.server";
import { DEMO_MUTATION_MESSAGE, isDemoWorkspace } from "@/lib/demo";
import { reportUnexpectedError } from "@/lib/error-reporting.server";
import {
  executeIdempotentMutation,
  IdempotencyConflictError,
} from "@/lib/idempotency.server";
import { getRequestId } from "@/lib/request-context.server";
import { moneyToCents } from "@/lib/revenue";
import {
  leadQualificationSchema,
} from "@/lib/validations/lead-qualification";
import { getCurrentWorkspace } from "@/lib/workspaces";
import { createLeadActivity } from "../services/activity-service";
import {
  normalizeDealProbability,
  parseDateInput,
} from "../services/lead-workflow-service";
import {
  crmUpdatePermissionError,
  ensureLeadMutationAllowed,
  revalidateLeadPaths,
} from "./shared";
import { isLeadActionId } from "../validations/action-inputs";

const qualificationSearchLimit = 20;

export type QualificationSearchResult = {
  accounts: Array<{ id: string; name: string }>;
  contacts: Array<{
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    title: string | null;
    accountId: string | null;
    accountName: string | null;
  }>;
};

export async function searchQualificationEntitiesAction(
  leadId: string,
  query: string,
): Promise<
  | { success: true; data: QualificationSearchResult }
  | { success: false; message: string }
> {
  if (!isLeadActionId(leadId) || typeof query !== "string" || query.length > 100) {
    return { success: false, message: "This lead could not be found." };
  }

  const [userId, workspace] = await Promise.all([
    requireUserId(),
    getCurrentWorkspace(),
  ]);
  const permissionError = crmUpdatePermissionError(workspace.role);
  if (permissionError) return { success: false, message: permissionError };

  const context = getWorkspaceAuthorizationContext(workspace, userId);
  const [lead] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(
      and(
        eq(leads.id, leadId),
        ...getRecordUpdateConditions(
          context,
          leads.workspaceId,
          leads.assignedOwnerUserId,
        ),
      ),
    )
    .limit(1);

  if (!lead) return { success: false, message: "This lead could not be found." };

  const term = query.trim();
  const accountSearch = term ? ilike(accounts.name, `%${term}%`) : undefined;
  const contactSearch = term
    ? or(
        ilike(contacts.fullName, `%${term}%`),
        ilike(contacts.email, `%${term}%`),
        ilike(contacts.phone, `%${term}%`),
      )
    : undefined;

  const [accountRows, contactRows] = await Promise.all([
    db
      .select({ id: accounts.id, name: accounts.name })
      .from(accounts)
      .where(
        and(
          eq(accounts.isArchived, false),
          accountSearch,
          ...getRecordVisibilityConditions(
            context,
            accounts.workspaceId,
            accounts.assignedOwnerUserId,
          ),
        ),
      )
      .orderBy(asc(accounts.name))
      .limit(qualificationSearchLimit),
    db
      .select({
        id: contacts.id,
        fullName: contacts.fullName,
        email: contacts.email,
        phone: contacts.phone,
        title: contacts.title,
        accountId: contacts.accountId,
        accountName: accounts.name,
      })
      .from(contacts)
      .leftJoin(
        accounts,
        and(
          eq(contacts.accountId, accounts.id),
          eq(contacts.workspaceId, accounts.workspaceId),
        ),
      )
      .where(
        and(
          eq(contacts.isArchived, false),
          contactSearch,
          ...getRecordVisibilityConditions(
            context,
            contacts.workspaceId,
            contacts.assignedOwnerUserId,
          ),
        ),
      )
      .orderBy(asc(contacts.fullName))
      .limit(qualificationSearchLimit),
  ]);

  return {
    success: true,
    data: { accounts: accountRows, contacts: contactRows },
  };
}

type QualificationResult =
  | {
      success: true;
      reused: boolean;
      message: string;
      accountId: string | null;
      contactId: string | null;
      dealId: string;
    }
  | {
      success: false;
      message: string;
      code?: "conflict" | "duplicate_account" | "duplicate_contact";
    };

class QualificationConflict extends Error {
  constructor(
    message: string,
    readonly code: "conflict" | "duplicate_account" | "duplicate_contact",
  ) {
    super(message);
  }
}

function normalizedPhone(value?: string) {
  return value?.replace(/\D/g, "") || null;
}

export async function qualifyLeadAction(
  leadId: string,
  input: unknown,
): Promise<QualificationResult> {
  if (!isLeadActionId(leadId)) {
    return { success: false, message: "This lead could not be found." };
  }

  const parsed = leadQualificationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Review the qualification details and try again." };
  }

  const [userId, workspace, protection, requestId] = await Promise.all([
    requireUserId(),
    getCurrentWorkspace(),
    ensureLeadMutationAllowed("deal:create"),
    getRequestId(),
  ]);
  const permissionError = crmUpdatePermissionError(workspace.role);
  if (permissionError) return { success: false, message: permissionError };
  if (!protection.ok) return { success: false, message: protection.message };
  if (isDemoWorkspace(workspace)) {
    return { success: false, message: DEMO_MUTATION_MESSAGE };
  }

  const context = getWorkspaceAuthorizationContext(workspace, userId);
  const values = parsed.data;

  try {
    const { value: result } = await executeIdempotentMutation<{
      reused: boolean;
      accountId: string | null;
      contactId: string | null;
      dealId: string;
    }>({
      workspaceId: workspace.id,
      actorUserId: userId,
      action: "lead.qualify",
      idempotencyKey: values.requestKey,
      request: { leadId, ...values, requestKey: undefined },
    }, async (tx) => {
      const [lead] = await tx
        .select({
          id: leads.id,
          fullName: leads.fullName,
          status: leads.status,
          assignedOwnerUserId: leads.assignedOwnerUserId,
        })
        .from(leads)
        .where(
          and(
            eq(leads.id, leadId),
            ...getRecordUpdateConditions(
              context,
              leads.workspaceId,
              leads.assignedOwnerUserId,
            ),
          ),
        )
        .for("update")
        .limit(1);

      if (!lead) throw new QualificationConflict("This lead could not be found.", "conflict");

      const [existingDeal] = await tx
        .select({
          id: deals.id,
          accountId: deals.accountId,
          contactId: deals.contactId,
        })
        .from(deals)
        .where(and(eq(deals.workspaceId, workspace.id), eq(deals.leadId, leadId)))
        .limit(1);

      if (existingDeal) {
        const response = {
          reused: true as const,
          accountId: existingDeal.accountId,
          contactId: existingDeal.contactId,
          dealId: existingDeal.id,
        };
        return { response, resource: { type: "deal", id: existingDeal.id } };
      }

      const [owner] = await tx
        .select({ userId: workspaceMembers.userId })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspace.id),
            eq(workspaceMembers.userId, values.ownerUserId),
          ),
        )
        .for("share")
        .limit(1);

      if (!owner) {
        throw new QualificationConflict(
          "Choose an owner from the active workspace.",
          "conflict",
        );
      }
      if (
        values.ownerUserId !== userId &&
        !hasWorkspacePermission(workspace.role, "crm:assign")
      ) {
        throw new QualificationConflict(
          "You do not have permission to change record assignments.",
          "conflict",
        );
      }

      let existingAccount: { id: string; name: string } | null = null;
      if (values.accountMode === "existing") {
        const [record] = await tx
          .select({ id: accounts.id, name: accounts.name })
          .from(accounts)
          .where(
            and(
              eq(accounts.id, values.accountId!),
              eq(accounts.isArchived, false),
              ...getRecordVisibilityConditions(
                context,
                accounts.workspaceId,
                accounts.assignedOwnerUserId,
              ),
            ),
          )
          .limit(1);
        if (!record) {
          throw new QualificationConflict(
            "The selected account is not available in this workspace.",
            "conflict",
          );
        }
        existingAccount = record;
      } else {
        const [duplicate] = await tx
          .select({ id: accounts.id })
          .from(accounts)
          .where(
            and(
              eq(accounts.workspaceId, workspace.id),
              eq(accounts.isArchived, false),
              sql`lower(trim(${accounts.name})) = lower(trim(${values.accountName!}))`,
            ),
          )
          .limit(1);
        if (duplicate) {
          throw new QualificationConflict(
            "An account with this name already exists. Select it instead of creating a duplicate.",
            "duplicate_account",
          );
        }
      }

      let existingContact: { id: string; accountId: string | null } | null = null;
      if (values.contactMode === "existing") {
        const [record] = await tx
          .select({ id: contacts.id, accountId: contacts.accountId })
          .from(contacts)
          .where(
            and(
              eq(contacts.id, values.contactId!),
              eq(contacts.isArchived, false),
              ...getRecordVisibilityConditions(
                context,
                contacts.workspaceId,
                contacts.assignedOwnerUserId,
              ),
            ),
          )
          .limit(1);
        if (!record) {
          throw new QualificationConflict(
            "The selected contact is not available in this workspace.",
            "conflict",
          );
        }
        existingContact = record;
      } else if (values.contactEmail || values.contactPhone) {
        const email = values.contactEmail?.trim().toLowerCase();
        const phone = normalizedPhone(values.contactPhone);
        const duplicateConditions = [
          email ? sql`lower(trim(${contacts.email})) = ${email}` : undefined,
          phone
            ? sql`regexp_replace(coalesce(${contacts.phone}, ''), '[^0-9]', '', 'g') = ${phone}`
            : undefined,
        ].filter(Boolean);
        const [duplicate] = await tx
          .select({ id: contacts.id })
          .from(contacts)
          .where(
            and(
              eq(contacts.workspaceId, workspace.id),
              eq(contacts.isArchived, false),
              or(...(duplicateConditions as Parameters<typeof or>)),
            ),
          )
          .limit(1);

        if (duplicate && !values.acknowledgeContactDuplicate) {
          throw new QualificationConflict(
            "A contact with the same email or phone may already exist. Select it or confirm creating a separate contact.",
            "duplicate_contact",
          );
        }
      }

      let accountId = existingAccount?.id ?? null;
      let accountCreated = false;
      if (!accountId) {
        const [created] = await tx
          .insert(accounts)
          .values({
            workspaceId: workspace.id,
            userId,
            assignedOwnerUserId: values.ownerUserId,
            name: values.accountName!,
          })
          .returning({ id: accounts.id });
        if (!created) throw new Error("Account creation failed.");
        accountId = created.id;
        accountCreated = true;
      }

      let contactId = existingContact?.id ?? null;
      let contactCreated = false;
      if (!contactId) {
        const [created] = await tx
          .insert(contacts)
          .values({
            workspaceId: workspace.id,
            userId,
            assignedOwnerUserId: values.ownerUserId,
            accountId,
            fullName: values.contactName!,
            email: values.contactEmail?.toLowerCase() ?? null,
            phone: values.contactPhone ?? null,
            title: values.contactTitle ?? null,
          })
          .returning({ id: contacts.id });
        if (!created) throw new Error("Contact creation failed.");
        contactId = created.id;
        contactCreated = true;
      } else if (existingContact?.accountId !== accountId) {
        const [attached] = await tx
          .update(contacts)
          .set({ accountId, updatedAt: new Date() })
          .where(
            and(
              eq(contacts.id, contactId),
              ...getRecordUpdateConditions(
                context,
                contacts.workspaceId,
                contacts.assignedOwnerUserId,
              ),
            ),
          )
          .returning({ id: contacts.id });
        if (!attached) {
          throw new QualificationConflict(
            "The selected contact could not be attached to this account.",
            "conflict",
          );
        }
      }

      const [deal] = await tx
        .insert(deals)
        .values({
          workspaceId: workspace.id,
          userId,
          ownerUserId: values.ownerUserId,
          leadId,
          accountId,
          contactId,
          name: values.dealName,
          stage: values.dealStage,
          valueCents: moneyToCents(values.dealValue),
          currency: values.dealCurrency,
          probability: normalizeDealProbability(
            values.dealStage,
            values.dealProbability,
          ),
          expectedCloseAt: parseDateInput(values.expectedCloseDate),
        })
        .onConflictDoNothing({ target: [deals.workspaceId, deals.leadId] })
        .returning({ id: deals.id });
      if (!deal) {
        throw new QualificationConflict(
          "This lead was qualified by another request. Refresh to see the created deal.",
          "conflict",
        );
      }

      const qualifiedAt = new Date();
      const [updatedLead] = await tx
        .update(leads)
        .set({
          accountId,
          primaryContactId: contactId,
          assignedOwnerUserId: values.ownerUserId,
          status: "Interested",
          updatedAt: qualifiedAt,
        })
        .where(
          and(
            eq(leads.id, leadId),
            ...getRecordUpdateConditions(
              context,
              leads.workspaceId,
              leads.assignedOwnerUserId,
            ),
          ),
        )
        .returning({ id: leads.id });
      if (!updatedLead) throw new Error("Lead qualification update failed.");

      const metadata = {
        actorUserId: userId,
        accountId,
        accountAction: accountCreated ? "created" : "selected",
        contactId,
        contactAction: contactCreated ? "created" : "selected",
        dealId: deal.id,
        ownerUserId: values.ownerUserId,
        qualifiedAt: qualifiedAt.toISOString(),
        requestKey: values.requestKey,
      };

      await createLeadActivity({
        client: tx,
        workspaceId: workspace.id,
        userId,
        eventType: "lead_qualified",
        message: `Lead qualified: ${lead.fullName} → ${values.dealName}`,
        leadId,
        leadName: lead.fullName,
        metadata,
      });
      await writeAuditEvent({
        tx,
        workspaceId: workspace.id,
        actor: { userId, role: workspace.role },
        action: "lead.qualified",
        entity: { type: "lead", id: leadId },
        before: { status: lead.status, accountId: null, contactId: null },
        after: { status: "Interested", accountId, contactId, dealId: deal.id },
        metadata,
        requestId,
        eventKey: `lead-qualified:${leadId}`,
      });

      return {
        response: { reused: false as const, accountId, contactId, dealId: deal.id },
        resource: { type: "deal", id: deal.id },
      };
    });

    revalidateLeadPaths(leadId);
    return {
      success: true,
      reused: result.reused,
      message: result.reused
        ? "This lead is already qualified. Opening the existing deal."
        : "Lead qualified successfully.",
      accountId: result.accountId,
      contactId: result.contactId,
      dealId: result.dealId,
    };
  } catch (error) {
    if (error instanceof QualificationConflict) {
      return { success: false, message: error.message, code: error.code };
    }
    if (error instanceof IdempotencyConflictError) {
      return { success: false, message: error.message, code: "conflict" };
    }
    await reportUnexpectedError(error, {
      event: "lead.qualify.failed",
      requestId,
      workspaceId: workspace.id,
      userId,
      operation: "lead.qualify",
    });
    return {
      success: false,
      message: "We couldn't qualify this lead. No changes were saved.",
    };
  }
}
