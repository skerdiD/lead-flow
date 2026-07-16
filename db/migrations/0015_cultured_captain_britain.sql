ALTER TYPE "public"."activity_event_type" ADD VALUE 'deal_updated' BEFORE 'lead_qualified';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'deal_lost' BEFORE 'lead_qualified';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'account_created' BEFORE 'lead_qualified';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'account_updated' BEFORE 'lead_qualified';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'account_archived' BEFORE 'lead_qualified';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'contact_created' BEFORE 'lead_qualified';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'contact_updated' BEFORE 'lead_qualified';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'contact_archived' BEFORE 'lead_qualified';--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "assigned_owner_user_id" varchar(255);--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "contact_id" uuid;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "deal_id" uuid;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "assigned_owner_user_id" varchar(255);--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "is_primary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_workspace_account_tenant_fk" FOREIGN KEY ("workspace_id","account_id") REFERENCES "public"."accounts"("workspace_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_workspace_contact_tenant_fk" FOREIGN KEY ("workspace_id","contact_id") REFERENCES "public"."contacts"("workspace_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_workspace_deal_tenant_fk" FOREIGN KEY ("workspace_id","deal_id") REFERENCES "public"."deals"("workspace_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_workspace_id_archived_idx" ON "accounts" USING btree ("workspace_id","is_archived");--> statement-breakpoint
CREATE INDEX "accounts_workspace_id_owner_idx" ON "accounts" USING btree ("workspace_id","assigned_owner_user_id");--> statement-breakpoint
CREATE INDEX "activity_events_workspace_account_created_at_idx" ON "activity_events" USING btree ("workspace_id","account_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_events_workspace_contact_created_at_idx" ON "activity_events" USING btree ("workspace_id","contact_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_events_workspace_deal_created_at_idx" ON "activity_events" USING btree ("workspace_id","deal_id","created_at");--> statement-breakpoint
CREATE INDEX "contacts_workspace_id_archived_idx" ON "contacts" USING btree ("workspace_id","is_archived");--> statement-breakpoint
CREATE INDEX "contacts_workspace_id_owner_idx" ON "contacts" USING btree ("workspace_id","assigned_owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_one_primary_per_account" ON "contacts" USING btree ("workspace_id","account_id") WHERE "contacts"."is_primary" = true and "contacts"."account_id" is not null;