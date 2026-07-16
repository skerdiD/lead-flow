-- Fail before changing constraints if a child row currently references a
-- workspace-scoped parent from another workspace. This migration never repairs
-- those rows automatically because the correct tenant is a business decision.
DO $$
DECLARE
  violations jsonb;
BEGIN
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'relationship', relationship,
        'invalid_rows', invalid_rows
      )
    ) FILTER (WHERE invalid_rows > 0),
    '[]'::jsonb
  )
  INTO violations
  FROM (
    SELECT 'contacts.account_id -> accounts.id' AS relationship, count(*) AS invalid_rows
    FROM contacts child
    INNER JOIN accounts parent ON parent.id = child.account_id
    WHERE child.workspace_id <> parent.workspace_id
    UNION ALL
    SELECT 'leads.account_id -> accounts.id', count(*)
    FROM leads child
    INNER JOIN accounts parent ON parent.id = child.account_id
    WHERE child.workspace_id <> parent.workspace_id
    UNION ALL
    SELECT 'leads.primary_contact_id -> contacts.id', count(*)
    FROM leads child
    INNER JOIN contacts parent ON parent.id = child.primary_contact_id
    WHERE child.workspace_id <> parent.workspace_id
    UNION ALL
    SELECT 'deals.lead_id -> leads.id', count(*)
    FROM deals child
    INNER JOIN leads parent ON parent.id = child.lead_id
    WHERE child.workspace_id <> parent.workspace_id
    UNION ALL
    SELECT 'deals.account_id -> accounts.id', count(*)
    FROM deals child
    INNER JOIN accounts parent ON parent.id = child.account_id
    WHERE child.workspace_id <> parent.workspace_id
    UNION ALL
    SELECT 'deals.contact_id -> contacts.id', count(*)
    FROM deals child
    INNER JOIN contacts parent ON parent.id = child.contact_id
    WHERE child.workspace_id <> parent.workspace_id
    UNION ALL
    SELECT 'crm_tasks.lead_id -> leads.id', count(*)
    FROM crm_tasks child
    INNER JOIN leads parent ON parent.id = child.lead_id
    WHERE child.workspace_id <> parent.workspace_id
    UNION ALL
    SELECT 'crm_tasks.deal_id -> deals.id', count(*)
    FROM crm_tasks child
    INNER JOIN deals parent ON parent.id = child.deal_id
    WHERE child.workspace_id <> parent.workspace_id
    UNION ALL
    SELECT 'crm_tasks.contact_id -> contacts.id', count(*)
    FROM crm_tasks child
    INNER JOIN contacts parent ON parent.id = child.contact_id
    WHERE child.workspace_id <> parent.workspace_id
    UNION ALL
    SELECT 'lead_notes.lead_id -> leads.id', count(*)
    FROM lead_notes child
    INNER JOIN leads parent ON parent.id = child.lead_id
    WHERE child.workspace_id <> parent.workspace_id
    UNION ALL
    SELECT 'activity_events.lead_id -> leads.id', count(*)
    FROM activity_events child
    INNER JOIN leads parent ON parent.id = child.lead_id
    WHERE child.workspace_id <> parent.workspace_id
    UNION ALL
    SELECT 'deals.value_cents must be non-negative', count(*)
    FROM deals
    WHERE value_cents < 0
    UNION ALL
    SELECT 'deals.probability must be between 0 and 100', count(*)
    FROM deals
    WHERE probability < 0 OR probability > 100
    UNION ALL
    SELECT 'deals.currency must be uppercase', count(*)
    FROM deals
    WHERE currency <> upper(currency)
    UNION ALL
    SELECT 'deals.won_or_lost requires closed_at', count(*)
    FROM deals
    WHERE stage IN ('won', 'lost') AND closed_at IS NULL
  ) AS tenant_integrity_checks;

  IF violations <> '[]'::jsonb THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Database integrity preflight failed; no constraints were changed.',
      DETAIL = violations::text,
      HINT = 'Use the diagnostic queries in docs/database-integrity.md to identify and explicitly repair each row before retrying the migration.';
  END IF;
END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX "accounts_workspace_id_id_unique" ON "accounts" USING btree ("workspace_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_workspace_id_id_unique" ON "contacts" USING btree ("workspace_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "leads_workspace_id_id_unique" ON "leads" USING btree ("workspace_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "deals_workspace_id_id_unique" ON "deals" USING btree ("workspace_id", "id");
--> statement-breakpoint

ALTER TABLE "contacts" DROP CONSTRAINT "contacts_account_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "leads" DROP CONSTRAINT "leads_account_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "leads" DROP CONSTRAINT "leads_primary_contact_id_contacts_id_fk";
--> statement-breakpoint
ALTER TABLE "deals" DROP CONSTRAINT "deals_lead_id_leads_id_fk";
--> statement-breakpoint
ALTER TABLE "deals" DROP CONSTRAINT "deals_account_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "deals" DROP CONSTRAINT "deals_contact_id_contacts_id_fk";
--> statement-breakpoint
ALTER TABLE "crm_tasks" DROP CONSTRAINT "crm_tasks_lead_id_leads_id_fk";
--> statement-breakpoint
ALTER TABLE "crm_tasks" DROP CONSTRAINT "crm_tasks_deal_id_deals_id_fk";
--> statement-breakpoint
ALTER TABLE "crm_tasks" DROP CONSTRAINT "crm_tasks_contact_id_contacts_id_fk";
--> statement-breakpoint
ALTER TABLE "lead_notes" DROP CONSTRAINT "lead_notes_lead_id_leads_id_fk";
--> statement-breakpoint

ALTER TABLE "contacts" ADD CONSTRAINT "contacts_workspace_account_tenant_fk" FOREIGN KEY ("workspace_id", "account_id") REFERENCES "public"."accounts"("workspace_id", "id") ON DELETE SET NULL ("account_id") ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_workspace_account_tenant_fk" FOREIGN KEY ("workspace_id", "account_id") REFERENCES "public"."accounts"("workspace_id", "id") ON DELETE SET NULL ("account_id") ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_workspace_primary_contact_tenant_fk" FOREIGN KEY ("workspace_id", "primary_contact_id") REFERENCES "public"."contacts"("workspace_id", "id") ON DELETE SET NULL ("primary_contact_id") ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_workspace_lead_tenant_fk" FOREIGN KEY ("workspace_id", "lead_id") REFERENCES "public"."leads"("workspace_id", "id") ON DELETE SET NULL ("lead_id") ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_workspace_account_tenant_fk" FOREIGN KEY ("workspace_id", "account_id") REFERENCES "public"."accounts"("workspace_id", "id") ON DELETE SET NULL ("account_id") ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_workspace_contact_tenant_fk" FOREIGN KEY ("workspace_id", "contact_id") REFERENCES "public"."contacts"("workspace_id", "id") ON DELETE SET NULL ("contact_id") ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_workspace_lead_tenant_fk" FOREIGN KEY ("workspace_id", "lead_id") REFERENCES "public"."leads"("workspace_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_workspace_deal_tenant_fk" FOREIGN KEY ("workspace_id", "deal_id") REFERENCES "public"."deals"("workspace_id", "id") ON DELETE SET NULL ("deal_id") ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_workspace_contact_tenant_fk" FOREIGN KEY ("workspace_id", "contact_id") REFERENCES "public"."contacts"("workspace_id", "id") ON DELETE SET NULL ("contact_id") ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_workspace_lead_tenant_fk" FOREIGN KEY ("workspace_id", "lead_id") REFERENCES "public"."leads"("workspace_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_workspace_lead_tenant_fk" FOREIGN KEY ("workspace_id", "lead_id") REFERENCES "public"."leads"("workspace_id", "id") ON DELETE SET NULL ("lead_id") ON UPDATE NO ACTION;
--> statement-breakpoint

ALTER TABLE "deals" ADD CONSTRAINT "deals_value_cents_non_negative_check" CHECK ("deals"."value_cents" >= 0);
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_probability_range_check" CHECK ("deals"."probability" BETWEEN 0 AND 100);
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_currency_uppercase_check" CHECK ("deals"."currency" = upper("deals"."currency"));
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_closed_at_for_final_stage_check" CHECK (("deals"."stage" IN ('won', 'lost') AND "deals"."closed_at" IS NOT NULL) OR "deals"."stage" NOT IN ('won', 'lost'));
