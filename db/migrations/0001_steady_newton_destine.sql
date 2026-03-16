CREATE TYPE "public"."lead_status" AS ENUM('New', 'Contacted', 'Interested', 'Proposal Sent', 'Closed', 'Lost');--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "full_name" SET DATA TYPE varchar(120);--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "company" SET DATA TYPE varchar(160);--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "email" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "phone" SET DATA TYPE varchar(32);--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'New'::"public"."lead_status";--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" SET DATA TYPE "public"."lead_status" USING "status"::"public"."lead_status";--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "source" SET DATA TYPE varchar(100);--> statement-breakpoint
CREATE INDEX "leads_user_id_idx" ON "leads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "leads_user_id_status_idx" ON "leads" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "leads_user_id_created_at_idx" ON "leads" USING btree ("user_id","created_at");