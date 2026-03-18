DO $$
BEGIN
  ALTER TYPE "public"."activity_event_type" ADD VALUE IF NOT EXISTS 'lead_note_added';
  ALTER TYPE "public"."activity_event_type" ADD VALUE IF NOT EXISTS 'lead_note_updated';
  ALTER TYPE "public"."activity_event_type" ADD VALUE IF NOT EXISTS 'lead_note_deleted';
EXCEPTION
  WHEN undefined_object THEN null;
END
$$;

CREATE TABLE IF NOT EXISTS "lead_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar(255) NOT NULL,
  "lead_id" uuid NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
  ALTER TABLE "lead_notes"
    ADD CONSTRAINT "lead_notes_lead_id_leads_id_fk"
    FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;

CREATE INDEX IF NOT EXISTS "lead_notes_user_id_idx" ON "lead_notes" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "lead_notes_lead_id_idx" ON "lead_notes" USING btree ("lead_id");
CREATE INDEX IF NOT EXISTS "lead_notes_user_id_created_at_idx" ON "lead_notes" USING btree ("user_id", "created_at");
