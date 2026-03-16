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