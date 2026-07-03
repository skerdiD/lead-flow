CREATE TYPE "follow_up_priority" AS ENUM ('low', 'medium', 'high');
CREATE TYPE "follow_up_status" AS ENUM ('pending', 'completed', 'rescheduled');

ALTER TYPE "activity_event_type" ADD VALUE IF NOT EXISTS 'lead_archived';
ALTER TYPE "activity_event_type" ADD VALUE IF NOT EXISTS 'lead_restored';

ALTER TABLE "leads" ADD COLUMN "next_follow_up_date" timestamp with time zone;
ALTER TABLE "leads" ADD COLUMN "follow_up_note" text;
ALTER TABLE "leads" ADD COLUMN "follow_up_priority" "follow_up_priority" DEFAULT 'medium' NOT NULL;
ALTER TABLE "leads" ADD COLUMN "follow_up_status" "follow_up_status" DEFAULT 'pending' NOT NULL;
ALTER TABLE "leads" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;
ALTER TABLE "leads" ADD COLUMN "archived_at" timestamp with time zone;

CREATE INDEX "leads_workspace_id_archived_idx" ON "leads" USING btree ("workspace_id", "is_archived");
CREATE INDEX "leads_workspace_id_follow_up_date_idx" ON "leads" USING btree ("workspace_id", "next_follow_up_date");
