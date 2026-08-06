import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
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
  "task_deleted",
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
  "crm_import_completed",
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

export const importEntityTypes = ["lead", "contact", "account"] as const;
export const importEntityTypeEnum = pgEnum(
  "import_entity_type",
  importEntityTypes,
);
export const importJobStatuses = [
  "draft",
  "reviewed",
  "processing",
  "completed",
  "failed",
] as const;
export const importJobStatusEnum = pgEnum(
  "import_job_status",
  importJobStatuses,
);
export const importDuplicateStrategies = [
  "skip",
  "update",
  "create_new",
] as const;
export const importDuplicateStrategyEnum = pgEnum(
  "import_duplicate_strategy",
  importDuplicateStrategies,
);
export const importRowStatuses = [
  "pending",
  "ready",
  "duplicate",
  "invalid",
  "imported",
  "updated",
  "skipped",
  "failed",
] as const;
export const importRowStatusEnum = pgEnum(
  "import_row_status",
  importRowStatuses,
);

export const idempotencyStatuses = ["processing", "completed"] as const;
export const idempotencyStatusEnum = pgEnum(
  "idempotency_status",
  idempotencyStatuses,
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
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
  (table) => [index("workspaces_name_idx").on(table.name)],
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
    check(
      "accounts_archive_consistency_check",
      sql`${table.isArchived} = (${table.archivedAt} IS NOT NULL)`,
    ),
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
    check(
      "contacts_archive_consistency_check",
      sql`${table.isArchived} = (${table.archivedAt} IS NOT NULL)`,
    ),
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
    check(
      "leads_archive_consistency_check",
      sql`${table.isArchived} = (${table.archivedAt} IS NOT NULL)`,
    ),
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
    // A lead's embedded opportunity is singular. Deals without a lead remain
    // valid because PostgreSQL unique constraints allow multiple NULL values.
    unique("deals_workspace_lead_unique").on(table.workspaceId, table.leadId),
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
    check(
      "deals_currency_format_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      "deals_closed_at_for_final_stage_check",
      sql`(${table.stage} IN ('won', 'lost')) = (${table.closedAt} IS NOT NULL)`,
    ),
    check(
      "deals_lost_reason_check",
      sql`${table.stage} <> 'lost' OR NULLIF(BTRIM(${table.lostReason}), '') IS NOT NULL`,
    ),
    index("deals_workspace_id_idx").on(table.workspaceId),
    index("deals_workspace_id_stage_idx").on(table.workspaceId, table.stage),
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
    check(
      "crm_tasks_completion_consistency_check",
      sql`(${table.status} = 'completed') = (${table.completedAt} IS NOT NULL)`,
    ),
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
    metadata: jsonb("metadata").$type<Record<string, string> | null>(),
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

export const importJobs = pgTable(
  "import_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorUserId: varchar("actor_user_id", { length: 255 }).notNull(),
    actorName: varchar("actor_name", { length: 160 }).notNull(),
    entityType: importEntityTypeEnum("entity_type").notNull(),
    originalFileName: varchar("original_file_name", { length: 255 }).notNull(),
    fileHash: varchar("file_hash", { length: 64 }).notNull(),
    status: importJobStatusEnum("status").notNull().default("draft"),
    totalRows: integer("total_rows").notNull().default(0),
    validRows: integer("valid_rows").notNull().default(0),
    invalidRows: integer("invalid_rows").notNull().default(0),
    duplicateRows: integer("duplicate_rows").notNull().default(0),
    importedRows: integer("imported_rows").notNull().default(0),
    updatedRows: integer("updated_rows").notNull().default(0),
    skippedRows: integer("skipped_rows").notNull().default(0),
    failedRows: integer("failed_rows").notNull().default(0),
    mapping: jsonb("mapping").$type<Record<string, string | null>>(),
    duplicateStrategy:
      importDuplicateStrategyEnum("duplicate_strategy").default("skip"),
    idempotencyKey: uuid("idempotency_key").defaultRandom().notNull(),
    requestId: uuid("request_id").defaultRandom().notNull(),
    errorMessage: varchar("error_message", { length: 255 }),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "date",
    }),
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
    }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("import_jobs_workspace_id_id_unique").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("import_jobs_workspace_idempotency_unique").on(
      table.workspaceId,
      table.idempotencyKey,
    ),
    index("import_jobs_workspace_created_at_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    index("import_jobs_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
  ],
);

export const importRows = pgTable(
  "import_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    importJobId: uuid("import_job_id").notNull(),
    rowNumber: integer("row_number").notNull(),
    status: importRowStatusEnum("status").notNull().default("pending"),
    rawData: jsonb("raw_data").$type<Record<string, string>>().notNull(),
    normalizedData: jsonb("normalized_data").$type<Record<string, unknown>>(),
    errors: jsonb("errors").$type<
      Array<{ field: string; value?: string; message: string }>
    >(),
    warnings: jsonb("warnings").$type<string[]>(),
    duplicateKind: varchar("duplicate_kind", { length: 32 }),
    existingRecordId: uuid("existing_record_id"),
    createdRecordId: uuid("created_record_id"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      name: "import_rows_workspace_job_tenant_fk",
      columns: [table.workspaceId, table.importJobId],
      foreignColumns: [importJobs.workspaceId, importJobs.id],
    }).onDelete("cascade"),
    uniqueIndex("import_rows_job_row_number_unique").on(
      table.importJobId,
      table.rowNumber,
    ),
    index("import_rows_job_status_idx").on(table.importJobId, table.status),
    index("import_rows_workspace_job_idx").on(
      table.workspaceId,
      table.importJobId,
    ),
  ],
);

/**
 * Durable coordination for retry-safe mutations. Response data is deliberately
 * limited to the small action result needed to replay a request; request bodies,
 * credentials, invitation tokens, and exported CRM data never belong here.
 */
export const idempotencyRecords = pgTable(
  "idempotency_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorUserId: varchar("actor_user_id", { length: 255 }).notNull(),
    action: varchar("action", { length: 120 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 200 }).notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    status: idempotencyStatusEnum("status").notNull().default("processing"),
    responseData: jsonb("response_data").$type<unknown>(),
    resourceType: varchar("resource_type", { length: 80 }),
    resourceId: varchar("resource_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" })
      .notNull(),
  },
  (table) => [
    uniqueIndex("idempotency_records_scope_key_unique").on(
      table.workspaceId,
      table.actorUserId,
      table.action,
      table.idempotencyKey,
    ),
    index("idempotency_records_expires_at_idx").on(table.expiresAt),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Deliberately no FK: audit history survives a workspace deletion request.
    workspaceId: uuid("workspace_id").notNull(),
    actorUserId: varchar("actor_user_id", { length: 255 }).notNull(),
    actorRole: varchar("actor_role", { length: 16 }).notNull().default("system"),
    action: varchar("action", { length: 120 }).notNull(),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: uuid("entity_id"),
    requestId: uuid("request_id").notNull(),
    before: jsonb("before").$type<Record<string, unknown>>(),
    after: jsonb("after").$type<Record<string, unknown>>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipHash: varchar("ip_hash", { length: 64 }),
    userAgentSummary: varchar("user_agent_summary", { length: 160 }),
    eventKey: varchar("event_key", { length: 120 }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_workspace_created_at_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    index("audit_logs_workspace_action_idx").on(
      table.workspaceId,
      table.action,
    ),
    index("audit_logs_workspace_actor_created_at_idx").on(
      table.workspaceId,
      table.actorUserId,
      table.createdAt,
    ),
    index("audit_logs_workspace_entity_created_at_idx").on(
      table.workspaceId,
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
    uniqueIndex("audit_logs_workspace_event_key_unique")
      .on(table.workspaceId, table.eventKey)
      .where(sql`${table.eventKey} is not null`),
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
