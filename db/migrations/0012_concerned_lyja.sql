CREATE TYPE "public"."notification_type" AS ENUM('task_due', 'task_overdue', 'task_assigned', 'lead_assigned', 'deal_stage_changed');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(160) NOT NULL,
	"message" varchar(255) NOT NULL,
	"action_url" varchar(255),
	"metadata" jsonb,
	"dedupe_key" varchar(255),
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_workspace_user_created_at_idx" ON "notifications" USING btree ("workspace_id","user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_workspace_user_read_at_idx" ON "notifications" USING btree ("workspace_id","user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_workspace_user_dedupe_key_unique" ON "notifications" USING btree ("workspace_id","user_id","dedupe_key");