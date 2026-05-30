import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const leadStatuses = [
  "New",
  "Contacted",
  "Interested",
  "Proposal Sent",
  "Closed",
  "Lost",
] as const;

export const leadStatusEnum = pgEnum("lead_status", leadStatuses);
export const activityEventTypes = [
  "lead_created",
  "lead_updated",
  "lead_status_changed",
  "lead_deleted",
  "lead_note_added",
  "lead_note_updated",
  "lead_note_deleted",
  "task_created",
  "task_completed",
  "deal_stage_changed",
  "lead_qualified",
] as const;
export const activityEventTypeEnum = pgEnum(
  "activity_event_type",
  activityEventTypes,
);

export const workspaceRoles = ["owner", "member"] as const;
export const workspaceRoleEnum = pgEnum("workspace_role", workspaceRoles);

export const dealStages = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;
export const dealStageEnum = pgEnum("deal_stage", dealStages);

export const taskStatuses = ["pending", "done", "overdue"] as const;
export const taskStatusEnum = pgEnum("task_status", taskStatuses);

export const taskPriorities = ["low", "medium", "high"] as const;
export const taskPriorityEnum = pgEnum("task_priority", taskPriorities);

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
    uniqueIndex("workspaces_owner_user_id_unique").on(table.ownerUserId),
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
    uniqueIndex("workspace_members_workspace_user_unique").on(
      table.workspaceId,
      table.userId,
    ),
    index("workspace_members_user_id_idx").on(table.userId),
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
    name: varchar("name", { length: 160 }).notNull(),
    website: varchar("website", { length: 255 }),
    industry: varchar("industry", { length: 120 }),
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
    index("accounts_workspace_id_idx").on(table.workspaceId),
    index("accounts_workspace_id_name_idx").on(table.workspaceId, table.name),
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
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    fullName: varchar("full_name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 32 }),
    title: varchar("title", { length: 120 }),
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
    index("contacts_workspace_id_idx").on(table.workspaceId),
    index("contacts_workspace_id_account_id_idx").on(
      table.workspaceId,
      table.accountId,
    ),
    index("contacts_workspace_id_email_idx").on(table.workspaceId, table.email),
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
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    primaryContactId: uuid("primary_contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    fullName: varchar("full_name", { length: 120 }).notNull(),
    company: varchar("company", { length: 160 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 32 }),
    status: leadStatusEnum("status").notNull().default("New"),
    source: varchar("source", { length: 100 }),
    notes: text("notes"),
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
    index("leads_workspace_id_idx").on(table.workspaceId),
    index("leads_workspace_id_status_idx").on(table.workspaceId, table.status),
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
    leadId: uuid("lead_id").references(() => leads.id, {
      onDelete: "set null",
    }),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 160 }).notNull(),
    stage: dealStageEnum("stage").notNull().default("new"),
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
    index("deals_workspace_id_idx").on(table.workspaceId),
    index("deals_workspace_id_stage_idx").on(table.workspaceId, table.stage),
    index("deals_workspace_id_lead_id_idx").on(table.workspaceId, table.leadId),
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
    leadId: uuid("lead_id").references(() => leads.id, {
      onDelete: "cascade",
    }),
    dealId: uuid("deal_id").references(() => deals.id, {
      onDelete: "set null",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
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
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
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
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow().notNull(),
  },
  (table) => [
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
  ],
);
