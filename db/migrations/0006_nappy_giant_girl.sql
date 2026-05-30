ALTER TABLE "deals" ADD COLUMN "value_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "currency" varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "probability" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "expected_close_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "lost_reason" varchar(255);--> statement-breakpoint
CREATE INDEX "deals_workspace_id_expected_close_idx" ON "deals" USING btree ("workspace_id","expected_close_at");--> statement-breakpoint
CREATE INDEX "deals_workspace_id_closed_at_idx" ON "deals" USING btree ("workspace_id","closed_at");