import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  ForeignKeyBuilder,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { NOTIFICATION_TYPES } from "@/lib/constants/notifications";

export const leadStatuses = [
  "New",
  "Contacted",
  "Interested",
  "Proposal Sent",
  "Closed",
  "Lost",
] as const;

export const leadStatusEnum = pgEnum("lead_status", leadStatuses);
export const followUpPriorities = ["low", "medium", "high"] as const;
export const followUpPriorityEnum = pgEnum(
  "follow_up_priority",
  followUpPriorities,
);
export const followUpStatuses = [
  "pending",
  "completed",
  "rescheduled",
] as const;
export const followUpStatusEnum = pgEnum("follow_up_status", followUpStatuses);
export const activityEventTypes = [
  "lead_created",
  "lead_updated",
  "lead_status_changed",
  "lead_deleted",
  "lead_archived",
  "lead_restored",
  "lead_note_added",
  "lead_note_updated",
  "lead_note_deleted",
  "task_created",
  "task_completed",
  "deal_stage_changed",
  "deal_updated",
  "deal_lost",
  "account_created",
  "account_updated",
  "account_archived",
  "contact_created",
  "contact_updated",
  "contact_archived",
  "lead_qualified",
  "member_invited",
  "invitation_accepted",
  "member_removed",
  "member_role_changed",
  "ownership_transferred",
] as const;
export const activityEventTypeEnum = pgEnum(
  "activity_event_type",
  activityEventTypes,
);

export const workspaceRoles = ["owner", "admin", "member"] as const;
export const workspaceRoleEnum = pgEnum("workspace_role", workspaceRoles);

export const invitationStatuses = ["pending", "accepted", "revoked"] as const;
export const invitationStatusEnum = pgEnum(
  "workspace_invitation_status",
  invitationStatuses,
);

export const dealStages = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;
export const dealStageEnum = pgEnum("deal_stage", dealStages);

export const taskStatuses = ["pending", "completed"] as const;
export const taskStatusEnum = pgEnum("task_status", taskStatuses);

export const taskPriorities = ["low", "medium", "high"] as const;
export const taskPriorityEnum = pgEnum("task_priority", taskPriorities);
export const notificationTypeEnum = pgEnum(
  "notification_type",
  NOTIFICATION_TYPES,
);

function getWorkspaceMemberReferenceColumns(): {
  workspaceId: import("drizzle-orm/pg-core").AnyPgColumn;
  userId: import("drizzle-orm/pg-core").AnyPgColumn;
} {
  return workspaceMembers;
}

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: varchar("owner_user_id", { length: 255 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    new ForeignKeyBuilder(() => ({
      name: "workspaces_owner_member_fk",
      columns: [table.id, table.ownerUserId],
      foreignColumns: [
        getWorkspaceMemberReferenceColumns().workspaceId,
        getWorkspaceMemberReferenceColumns().userId,
      ],
    })),
    uniqueIndex("workspaces_owner_name_unique").on(
      table.ownerUserId,
      table.name,
    ),
  ],
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 }).notNull(),
    role: workspaceRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("workspace_members_one_owner_per_workspace")
      .on(table.workspaceId)
      .where(sql`${table.role} = 'owner'`),
    uniqueIndex("workspace_members_workspace_user_unique").on(
      table.workspaceId,
      table.userId,
    ),
    index("workspace_members_user_id_idx").on(table.userId),
    index("workspace_members_workspace_role_idx").on(
      table.workspaceId,
      table.role,
    ),
  ],
);

export const workspaceInvitations = pgTable(
  "workspace_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    role: workspaceRoleEnum("role").notNull().default("member"),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    status: invitationStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    acceptedAt: timestamp("accepted_at", {
      withTimezone: true,
      mode: "date",
    }),
    acceptedByUserId: varchar("accepted_by_user_id", { length: 255 }),
    createdByUserId: varchar("created_by_user_id", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "workspace_invitations_role_non_owner",
      sql`${table.role} <> 'owner'`,
    ),
    uniqueIndex("workspace_invitations_token_hash_unique").on(table.tokenHash),
    index("workspace_invitations_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
    index("workspace_invitations_workspace_email_idx").on(
      table.workspaceId,
      table.email,
    ),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 }).notNull(),
    assignedOwnerUserId: varchar("assigned_owner_user_id", { length: 255 }),
    name: varchar("name", { length: 160 }).notNull(),
    website: varchar("website", { length: 255 }),
    industry: varchar("industry", { length: 120 }),
    isArchived: boolean("is_archived").notNull().default(false),
    archivedAt: timestamp("archived_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("accounts_workspace_id_id_unique").on(table.workspaceId, table.id),
    index("accounts_workspace_id_idx").on(table.workspaceId),
    index("accounts_workspace_id_name_idx").on(table.workspaceId, table.name),
    index("accounts_workspace_id_archived_idx").on(
      table.workspaceId,
      table.isArchived,
    ),
    index("accounts_workspace_id_owner_idx").on(
      table.workspaceId,
      table.assignedOwnerUserId,
    ),
    index("accounts_user_id_idx").on(table.userId),
  ],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 }).notNull(),
    assignedOwnerUserId: varchar("assigned_owner_user_id", { length: 255 }),
    accountId: uuid("account_id"),
    fullName: varchar("full_name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 32 }),
    title: varchar("title", { length: 120 }),
    isPrimary: boolean("is_primary").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    archivedAt: timestamp("archived_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("contacts_workspace_id_id_unique").on(table.workspaceId, table.id),
    foreignKey({
      name: "contacts_workspace_account_tenant_fk",
      columns: [table.workspaceId, table.accountId],
      foreignColumns: [accounts.workspaceId, accounts.id],
    }).onDelete("set null"),
    index("contacts_workspace_id_idx").on(table.workspaceId),
    index("contacts_workspace_id_account_id_idx").on(
      table.workspaceId,
      table.accountId,
    ),
    index("contacts_workspace_id_email_idx").on(table.workspaceId, table.email),
    index("contacts_workspace_id_archived_idx").on(
      table.workspaceId,
      table.isArchived,
    ),
    index("contacts_workspace_id_owner_idx").on(
      table.workspaceId,
      table.assignedOwnerUserId,
    ),
    uniqueIndex("contacts_one_primary_per_account")
      .on(table.workspaceId, table.accountId)
      .where(sql`${table.isPrimary} = true and ${table.accountId} is not null`),
    index("contacts_user_id_idx").on(table.userId),
  ],
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 }).notNull(),
    assignedOwnerUserId: varchar("assigned_owner_user_id", { length: 255 }),
    accountId: uuid("account_id"),
    primaryContactId: uuid("primary_contact_id"),
    fullName: varchar("full_name", { length: 120 }).notNull(),
    company: varchar("company", { length: 160 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 32 }),
    status: leadStatusEnum("status").notNull().default("New"),
    source: varchar("source", { length: 100 }),
    notes: text("notes"),
    nextFollowUpDate: timestamp("next_follow_up_date", {
      withTimezone: true,
      mode: "date",
    }),
    followUpNote: text("follow_up_note"),
    followUpPriority: followUpPriorityEnum("follow_up_priority")
      .notNull()
      .default("medium"),
    followUpStatus: followUpStatusEnum("follow_up_status")
      .notNull()
      .default("pending"),
    isArchived: boolean("is_archived").notNull().default(false),
    archivedAt: timestamp("archived_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("leads_workspace_id_id_unique").on(table.workspaceId, table.id),
    foreignKey({
      name: "leads_workspace_account_tenant_fk",
      columns: [table.workspaceId, table.accountId],
      foreignColumns: [accounts.workspaceId, accounts.id],
    }).onDelete("set null"),
    foreignKey({
      name: "leads_workspace_primary_contact_tenant_fk",
      columns: [table.workspaceId, table.primaryContactId],
      foreignColumns: [contacts.workspaceId, contacts.id],
    }).onDelete("set null"),
    index("leads_workspace_id_idx").on(table.workspaceId),
    index("leads_workspace_id_status_idx").on(table.workspaceId, table.status),
    index("leads_workspace_id_archived_idx").on(
      table.workspaceId,
      table.isArchived,
    ),
    index("leads_workspace_id_follow_up_date_idx").on(
      table.workspaceId,
      table.nextFollowUpDate,
    ),
    index("leads_workspace_id_created_at_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    index("leads_workspace_id_account_id_idx").on(
      table.workspaceId,
      table.accountId,
    ),
    index("leads_workspace_id_primary_contact_id_idx").on(
      table.workspaceId,
      table.primaryContactId,
    ),
    index("leads_workspace_id_owner_idx").on(
      table.workspaceId,
      table.assignedOwnerUserId,
    ),
    index("leads_user_id_idx").on(table.userId),
    index("leads_user_id_status_idx").on(table.userId, table.status),
    index("leads_user_id_created_at_idx").on(table.userId, table.createdAt),
  ],
);

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 }).notNull(),
    ownerUserId: varchar("owner_user_id", { length: 255 }),
    leadId: uuid("lead_id"),
    accountId: uuid("account_id"),
    contactId: uuid("contact_id"),
    name: varchar("name", { length: 160 }).notNull(),
    stage: dealStageEnum("stage").notNull().default("new"),
    valueCents: integer("value_cents").notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    probability: integer("probability").notNull().default(0),
    expectedCloseAt: timestamp("expected_close_at", {
      withTimezone: true,
      mode: "date",
    }),
    closedAt: timestamp("closed_at", {
      withTimezone: true,
      mode: "date",
    }),
    lostReason: varchar("lost_reason", { length: 255 }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("deals_workspace_id_id_unique").on(table.workspaceId, table.id),
    foreignKey({
      name: "deals_workspace_lead_tenant_fk",
      columns: [table.workspaceId, table.leadId],
      foreignColumns: [leads.workspaceId, leads.id],
    }).onDelete("set null"),
    foreignKey({
      name: "deals_workspace_account_tenant_fk",
      columns: [table.workspaceId, table.accountId],
      foreignColumns: [accounts.workspaceId, accounts.id],
    }).onDelete("set null"),
    foreignKey({
      name: "deals_workspace_contact_tenant_fk",
      columns: [table.workspaceId, table.contactId],
      foreignColumns: [contacts.workspaceId, contacts.id],
    }).onDelete("set null"),
    check("deals_value_cents_non_negative_check", sql`${table.valueCents} >= 0`),
    check(
      "deals_probability_range_check",
      sql`${table.probability} BETWEEN 0 AND 100`,
    ),
    check("deals_currency_uppercase_check", sql`${table.currency} = upper(${table.currency})`),
    check(
      "deals_closed_at_for_final_stage_check",
      sql`(${table.stage} IN ('won', 'lost') AND ${table.closedAt} IS NOT NULL) OR ${table.stage} NOT IN ('won', 'lost')`,
    ),
    index("deals_workspace_id_idx").on(table.workspaceId),
    index("deals_workspace_id_stage_idx").on(table.workspaceId, table.stage),
    index("deals_workspace_id_lead_id_idx").on(table.workspaceId, table.leadId),
    index("deals_workspace_id_expected_close_idx").on(
      table.workspaceId,
      table.expectedCloseAt,
    ),
    index("deals_workspace_id_closed_at_idx").on(
      table.workspaceId,
      table.closedAt,
    ),
    index("deals_workspace_id_owner_idx").on(table.workspaceId, table.ownerUserId),
    index("deals_user_id_idx").on(table.userId),
  ],
);

export const crmTasks = pgTable(
  "crm_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 }).notNull(),
    ownerUserId: varchar("owner_user_id", { length: 255 }),
    leadId: uuid("lead_id"),
    dealId: uuid("deal_id"),
    contactId: uuid("contact_id"),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description"),
    dueAt: timestamp("due_at", {
      withTimezone: true,
      mode: "date",
    }),
    status: taskStatusEnum("status").notNull().default("pending"),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "crm_tasks_workspace_lead_tenant_fk",
      columns: [table.workspaceId, table.leadId],
      foreignColumns: [leads.workspaceId, leads.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "crm_tasks_workspace_deal_tenant_fk",
      columns: [table.workspaceId, table.dealId],
      foreignColumns: [deals.workspaceId, deals.id],
    }).onDelete("set null"),
    foreignKey({
      name: "crm_tasks_workspace_contact_tenant_fk",
      columns: [table.workspaceId, table.contactId],
      foreignColumns: [contacts.workspaceId, contacts.id],
    }).onDelete("set null"),
    index("crm_tasks_workspace_id_idx").on(table.workspaceId),
    index("crm_tasks_workspace_id_status_idx").on(table.workspaceId, table.status),
    index("crm_tasks_workspace_id_due_at_idx").on(table.workspaceId, table.dueAt),
    index("crm_tasks_workspace_id_lead_id_idx").on(table.workspaceId, table.leadId),
    index("crm_tasks_workspace_id_deal_id_idx").on(table.workspaceId, table.dealId),
    index("crm_tasks_workspace_id_contact_id_idx").on(
      table.workspaceId,
      table.contactId,
    ),
    index("crm_tasks_workspace_id_owner_idx").on(table.workspaceId, table.ownerUserId),
    index("crm_tasks_user_id_idx").on(table.userId),
  ],
);

export const leadNotes = pgTable(
  "lead_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 }).notNull(),
    leadId: uuid("lead_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "lead_notes_workspace_lead_tenant_fk",
      columns: [table.workspaceId, table.leadId],
      foreignColumns: [leads.workspaceId, leads.id],
    }).onDelete("cascade"),
    index("lead_notes_workspace_id_idx").on(table.workspaceId),
    index("lead_notes_workspace_id_created_at_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    index("lead_notes_user_id_idx").on(table.userId),
    index("lead_notes_lead_id_idx").on(table.leadId),
    index("lead_notes_user_id_created_at_idx").on(table.userId, table.createdAt),
  ],
);

export const activityEvents = pgTable(
  "activity_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 }).notNull(),
    eventType: activityEventTypeEnum("event_type").notNull(),
    message: varchar("message", { length: 255 }).notNull(),
    leadId: uuid("lead_id"),
    leadName: varchar("lead_name", { length: 120 }),
    accountId: uuid("account_id"),
    contactId: uuid("contact_id"),
    dealId: uuid("deal_id"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      name: "activity_events_workspace_lead_tenant_fk",
      columns: [table.workspaceId, table.leadId],
      foreignColumns: [leads.workspaceId, leads.id],
    }).onDelete("set null"),
    foreignKey({
      name: "activity_events_workspace_account_tenant_fk",
      columns: [table.workspaceId, table.accountId],
      foreignColumns: [accounts.workspaceId, accounts.id],
    }).onDelete("set null"),
    foreignKey({
      name: "activity_events_workspace_contact_tenant_fk",
      columns: [table.workspaceId, table.contactId],
      foreignColumns: [contacts.workspaceId, contacts.id],
    }).onDelete("set null"),
    foreignKey({
      name: "activity_events_workspace_deal_tenant_fk",
      columns: [table.workspaceId, table.dealId],
      foreignColumns: [deals.workspaceId, deals.id],
    }).onDelete("set null"),
    index("activity_events_workspace_id_idx").on(table.workspaceId),
    index("activity_events_workspace_id_created_at_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    index("activity_events_workspace_id_event_type_idx").on(
      table.workspaceId,
      table.eventType,
    ),
    index("activity_events_user_id_idx").on(table.userId),
    index("activity_events_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("activity_events_user_id_event_type_idx").on(
      table.userId,
      table.eventType,
    ),
    index("activity_events_workspace_account_created_at_idx").on(
      table.workspaceId,
      table.accountId,
      table.createdAt,
    ),
    index("activity_events_workspace_contact_created_at_idx").on(
      table.workspaceId,
      table.contactId,
      table.createdAt,
    ),
    index("activity_events_workspace_deal_created_at_idx").on(
      table.workspaceId,
      table.dealId,
      table.createdAt,
    ),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 }).notNull(),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    message: varchar("message", { length: 255 }).notNull(),
    actionUrl: varchar("action_url", { length: 255 }),
    metadata: jsonb("metadata").$type<Record<string, string> | null>(),
    dedupeKey: varchar("dedupe_key", { length: 255 }),
    readAt: timestamp("read_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow().notNull(),
  },
  (table) => [
    index("notifications_workspace_user_created_at_idx").on(
      table.workspaceId,
      table.userId,
      table.createdAt,
    ),
    index("notifications_workspace_user_read_at_idx").on(
      table.workspaceId,
      table.userId,
      table.readAt,
    ),
    uniqueIndex("notifications_workspace_user_dedupe_key_unique").on(
      table.workspaceId,
      table.userId,
      table.dedupeKey,
    ),
  ],
);
