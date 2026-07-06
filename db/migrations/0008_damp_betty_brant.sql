ALTER TABLE "crm_tasks" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "crm_tasks" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
UPDATE "crm_tasks"
SET "status" = CASE
  WHEN "status" = 'done' THEN 'completed'
  WHEN "status" = 'overdue' THEN 'pending'
  ELSE "status"
END;--> statement-breakpoint
DROP TYPE "public"."task_status";--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'completed');--> statement-breakpoint
ALTER TABLE "crm_tasks" ALTER COLUMN "status" SET DATA TYPE "public"."task_status" USING "status"::"public"."task_status";--> statement-breakpoint
ALTER TABLE "crm_tasks" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."task_status";--> statement-breakpoint
UPDATE "crm_tasks"
SET
  "completed_at" = coalesce("completed_at", now()),
  "updated_at" = now()
WHERE "status" = 'completed' AND "completed_at" IS NULL;
