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
] as const;
export const activityEventTypeEnum = pgEnum(
  "activity_event_type",
  activityEventTypes,
);

export const workspaceRoles = ["owner", "member"] as const;
export const workspaceRoleEnum = pgEnum("workspace_role", workspaceRoles);

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

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 }).notNull(),
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
    index("leads_user_id_idx").on(table.userId),
    index("leads_user_id_status_idx").on(table.userId, table.status),
    index("leads_user_id_created_at_idx").on(table.userId, table.createdAt),
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
