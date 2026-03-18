import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
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

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
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
    index("leads_user_id_idx").on(table.userId),
    index("leads_user_id_status_idx").on(table.userId, table.status),
    index("leads_user_id_created_at_idx").on(table.userId, table.createdAt),
  ],
);

export const leadNotes = pgTable(
  "lead_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
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
    index("lead_notes_user_id_idx").on(table.userId),
    index("lead_notes_lead_id_idx").on(table.leadId),
    index("lead_notes_user_id_created_at_idx").on(table.userId, table.createdAt),
  ],
);

export const activityEvents = pgTable(
  "activity_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
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
