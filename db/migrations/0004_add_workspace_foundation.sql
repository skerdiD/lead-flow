CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" varchar(255) NOT NULL,
	"name" varchar(160) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"role" "workspace_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "lead_notes" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_owner_user_id_unique" ON "workspaces" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_workspace_user_unique" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
INSERT INTO "workspaces" ("owner_user_id", "name")
SELECT DISTINCT "user_id", 'Personal Workspace'
FROM (
	SELECT "user_id" FROM "leads"
	UNION
	SELECT "user_id" FROM "lead_notes"
	UNION
	SELECT "user_id" FROM "activity_events"
) AS "existing_users"
WHERE "user_id" IS NOT NULL
ON CONFLICT ("owner_user_id") DO NOTHING;--> statement-breakpoint
INSERT INTO "workspace_members" ("workspace_id", "user_id", "role")
SELECT "id", "owner_user_id", 'owner'::"public"."workspace_role"
FROM "workspaces"
WHERE "owner_user_id" IN (
	SELECT "user_id" FROM "leads"
	UNION
	SELECT "user_id" FROM "lead_notes"
	UNION
	SELECT "user_id" FROM "activity_events"
)
ON CONFLICT ("workspace_id", "user_id") DO NOTHING;--> statement-breakpoint
UPDATE "leads"
SET "workspace_id" = "workspaces"."id"
FROM "workspaces"
WHERE "leads"."workspace_id" IS NULL
	AND "leads"."user_id" = "workspaces"."owner_user_id";--> statement-breakpoint
UPDATE "lead_notes"
SET "workspace_id" = "workspaces"."id"
FROM "workspaces"
WHERE "lead_notes"."workspace_id" IS NULL
	AND "lead_notes"."user_id" = "workspaces"."owner_user_id";--> statement-breakpoint
UPDATE "activity_events"
SET "workspace_id" = "workspaces"."id"
FROM "workspaces"
WHERE "activity_events"."workspace_id" IS NULL
	AND "activity_events"."user_id" = "workspaces"."owner_user_id";--> statement-breakpoint
ALTER TABLE "activity_events" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "lead_notes" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_events_workspace_id_idx" ON "activity_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "activity_events_workspace_id_created_at_idx" ON "activity_events" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_events_workspace_id_event_type_idx" ON "activity_events" USING btree ("workspace_id","event_type");--> statement-breakpoint
CREATE INDEX "lead_notes_workspace_id_idx" ON "lead_notes" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "lead_notes_workspace_id_created_at_idx" ON "lead_notes" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "leads_workspace_id_idx" ON "leads" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "leads_workspace_id_status_idx" ON "leads" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "leads_workspace_id_created_at_idx" ON "leads" USING btree ("workspace_id","created_at");
