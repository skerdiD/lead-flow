ALTER TABLE "audit_logs" ADD COLUMN "actor_role" varchar(16) DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "before" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "after" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "ip_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "user_agent_summary" varchar(160);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "event_key" varchar(120);--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_actor_created_at_idx" ON "audit_logs" USING btree ("workspace_id","actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_entity_created_at_idx" ON "audit_logs" USING btree ("workspace_id","entity_type","entity_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_logs_workspace_event_key_unique" ON "audit_logs" USING btree ("workspace_id","event_key") WHERE "audit_logs"."event_key" is not null;