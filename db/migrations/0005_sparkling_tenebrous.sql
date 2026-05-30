CREATE TYPE "public"."deal_stage" AS ENUM('new', 'contacted', 'qualified', 'proposal', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'done', 'overdue');--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'task_created';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'task_completed';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'deal_stage_changed';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'lead_qualified';--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"name" varchar(160) NOT NULL,
	"website" varchar(255),
	"industry" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"account_id" uuid,
	"full_name" varchar(120) NOT NULL,
	"email" varchar(255),
	"phone" varchar(32),
	"title" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"owner_user_id" varchar(255),
	"lead_id" uuid,
	"deal_id" uuid,
	"contact_id" uuid,
	"title" varchar(160) NOT NULL,
	"description" text,
	"due_at" timestamp with time zone,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"owner_user_id" varchar(255),
	"lead_id" uuid,
	"account_id" uuid,
	"contact_id" uuid,
	"name" varchar(160) NOT NULL,
	"stage" "deal_stage" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "assigned_owner_user_id" varchar(255);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "primary_contact_id" uuid;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_workspace_id_idx" ON "accounts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "accounts_workspace_id_name_idx" ON "accounts" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contacts_workspace_id_idx" ON "contacts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "contacts_workspace_id_account_id_idx" ON "contacts" USING btree ("workspace_id","account_id");--> statement-breakpoint
CREATE INDEX "contacts_workspace_id_email_idx" ON "contacts" USING btree ("workspace_id","email");--> statement-breakpoint
CREATE INDEX "contacts_user_id_idx" ON "contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "crm_tasks_workspace_id_idx" ON "crm_tasks" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "crm_tasks_workspace_id_status_idx" ON "crm_tasks" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "crm_tasks_workspace_id_due_at_idx" ON "crm_tasks" USING btree ("workspace_id","due_at");--> statement-breakpoint
CREATE INDEX "crm_tasks_workspace_id_lead_id_idx" ON "crm_tasks" USING btree ("workspace_id","lead_id");--> statement-breakpoint
CREATE INDEX "crm_tasks_workspace_id_deal_id_idx" ON "crm_tasks" USING btree ("workspace_id","deal_id");--> statement-breakpoint
CREATE INDEX "crm_tasks_workspace_id_contact_id_idx" ON "crm_tasks" USING btree ("workspace_id","contact_id");--> statement-breakpoint
CREATE INDEX "crm_tasks_workspace_id_owner_idx" ON "crm_tasks" USING btree ("workspace_id","owner_user_id");--> statement-breakpoint
CREATE INDEX "crm_tasks_user_id_idx" ON "crm_tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "deals_workspace_id_idx" ON "deals" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "deals_workspace_id_stage_idx" ON "deals" USING btree ("workspace_id","stage");--> statement-breakpoint
CREATE INDEX "deals_workspace_id_lead_id_idx" ON "deals" USING btree ("workspace_id","lead_id");--> statement-breakpoint
CREATE INDEX "deals_workspace_id_owner_idx" ON "deals" USING btree ("workspace_id","owner_user_id");--> statement-breakpoint
CREATE INDEX "deals_user_id_idx" ON "deals" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_primary_contact_id_contacts_id_fk" FOREIGN KEY ("primary_contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_workspace_id_account_id_idx" ON "leads" USING btree ("workspace_id","account_id");--> statement-breakpoint
CREATE INDEX "leads_workspace_id_primary_contact_id_idx" ON "leads" USING btree ("workspace_id","primary_contact_id");--> statement-breakpoint
CREATE INDEX "leads_workspace_id_owner_idx" ON "leads" USING btree ("workspace_id","assigned_owner_user_id");