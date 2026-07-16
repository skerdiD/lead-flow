CREATE TYPE "public"."import_duplicate_strategy" AS ENUM('skip', 'update', 'create_new');--> statement-breakpoint
CREATE TYPE "public"."import_entity_type" AS ENUM('lead', 'contact', 'account');--> statement-breakpoint
CREATE TYPE "public"."import_job_status" AS ENUM('draft', 'reviewed', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."import_row_status" AS ENUM('pending', 'ready', 'duplicate', 'invalid', 'imported', 'updated', 'skipped', 'failed');--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'crm_import_completed';--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor_user_id" varchar(255) NOT NULL,
	"action" varchar(120) NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" uuid,
	"request_id" uuid NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor_user_id" varchar(255) NOT NULL,
	"actor_name" varchar(160) NOT NULL,
	"entity_type" "import_entity_type" NOT NULL,
	"original_file_name" varchar(255) NOT NULL,
	"file_hash" varchar(64) NOT NULL,
	"status" "import_job_status" DEFAULT 'draft' NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"valid_rows" integer DEFAULT 0 NOT NULL,
	"invalid_rows" integer DEFAULT 0 NOT NULL,
	"duplicate_rows" integer DEFAULT 0 NOT NULL,
	"imported_rows" integer DEFAULT 0 NOT NULL,
	"updated_rows" integer DEFAULT 0 NOT NULL,
	"skipped_rows" integer DEFAULT 0 NOT NULL,
	"failed_rows" integer DEFAULT 0 NOT NULL,
	"mapping" jsonb,
	"duplicate_strategy" "import_duplicate_strategy" DEFAULT 'skip',
	"idempotency_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"error_message" varchar(255),
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"import_job_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"status" "import_row_status" DEFAULT 'pending' NOT NULL,
	"raw_data" jsonb NOT NULL,
	"normalized_data" jsonb,
	"errors" jsonb,
	"warnings" jsonb,
	"duplicate_kind" varchar(32),
	"existing_record_id" uuid,
	"created_record_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "import_jobs_workspace_id_id_unique" ON "import_jobs" USING btree ("workspace_id","id");--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_workspace_job_tenant_fk" FOREIGN KEY ("workspace_id","import_job_id") REFERENCES "public"."import_jobs"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_created_at_idx" ON "audit_logs" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_action_idx" ON "audit_logs" USING btree ("workspace_id","action");--> statement-breakpoint
CREATE UNIQUE INDEX "import_jobs_workspace_idempotency_unique" ON "import_jobs" USING btree ("workspace_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "import_jobs_workspace_created_at_idx" ON "import_jobs" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "import_jobs_workspace_status_idx" ON "import_jobs" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "import_rows_job_row_number_unique" ON "import_rows" USING btree ("import_job_id","row_number");--> statement-breakpoint
CREATE INDEX "import_rows_job_status_idx" ON "import_rows" USING btree ("import_job_id","status");--> statement-breakpoint
CREATE INDEX "import_rows_workspace_job_idx" ON "import_rows" USING btree ("workspace_id","import_job_id");
