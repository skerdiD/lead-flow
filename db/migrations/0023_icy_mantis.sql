-- The status/boolean columns are the authoritative historical state. Restore
-- missing timestamps from the row's last known update and clear timestamps
-- that contradict a non-completed/non-archived state.
UPDATE "crm_tasks"
SET "completed_at" = "updated_at"
WHERE "status" = 'completed' AND "completed_at" IS NULL;--> statement-breakpoint
UPDATE "crm_tasks"
SET "completed_at" = NULL
WHERE "status" <> 'completed' AND "completed_at" IS NOT NULL;--> statement-breakpoint
UPDATE "accounts"
SET "archived_at" = "updated_at"
WHERE "is_archived" = true AND "archived_at" IS NULL;--> statement-breakpoint
UPDATE "accounts"
SET "archived_at" = NULL
WHERE "is_archived" = false AND "archived_at" IS NOT NULL;--> statement-breakpoint
UPDATE "contacts"
SET "archived_at" = "updated_at"
WHERE "is_archived" = true AND "archived_at" IS NULL;--> statement-breakpoint
UPDATE "contacts"
SET "archived_at" = NULL
WHERE "is_archived" = false AND "archived_at" IS NOT NULL;--> statement-breakpoint
UPDATE "leads"
SET "archived_at" = "updated_at"
WHERE "is_archived" = true AND "archived_at" IS NULL;--> statement-breakpoint
UPDATE "leads"
SET "archived_at" = NULL
WHERE "is_archived" = false AND "archived_at" IS NOT NULL;--> statement-breakpoint

-- Preserve the deal stage as authoritative. Historical closed timestamps on
-- open deals are cleared; a missing final-stage timestamp uses updated_at as
-- the closest available record of when the state was last changed.
UPDATE "deals"
SET "closed_at" = "updated_at"
WHERE "stage" IN ('won', 'lost') AND "closed_at" IS NULL;--> statement-breakpoint
UPDATE "deals"
SET "closed_at" = NULL
WHERE "stage" NOT IN ('won', 'lost') AND "closed_at" IS NOT NULL;--> statement-breakpoint

-- Application writes trim lost reasons. Normalize legacy nonblank values, but
-- never invent a business reason for a lost deal.
UPDATE "deals"
SET "lost_reason" = BTRIM("lost_reason")
WHERE "lost_reason" IS NOT NULL
  AND "lost_reason" <> BTRIM("lost_reason");--> statement-breakpoint

-- Normalize only values whose intent is unambiguous and supported by the app.
UPDATE "deals"
SET "currency" = UPPER(BTRIM("currency"))
WHERE UPPER(BTRIM("currency")) IN ('USD', 'EUR', 'GBP')
  AND "currency" <> UPPER(BTRIM("currency"));--> statement-breakpoint

-- Missing lost reasons and malformed currencies cannot be repaired safely.
-- Abort with counts so an operator can supply the correct business data.
DO $$
DECLARE
  violations jsonb;
BEGIN
  SELECT coalesce(
    jsonb_agg(jsonb_build_object('rule', rule, 'invalid_rows', invalid_rows))
      FILTER (WHERE invalid_rows > 0),
    '[]'::jsonb
  )
  INTO violations
  FROM (
    SELECT 'lost deal requires a nonblank lost_reason' AS rule, count(*) AS invalid_rows
    FROM deals
    WHERE stage = 'lost' AND NULLIF(BTRIM(lost_reason), '') IS NULL
    UNION ALL
    SELECT 'currency must contain exactly three uppercase ASCII letters', count(*)
    FROM deals
    WHERE currency !~ '^[A-Z]{3}$'
  ) AS invariant_checks;

  IF violations <> '[]'::jsonb THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Business invariant preflight failed; no constraints were changed.',
      DETAIL = violations::text,
      HINT = 'Repair the reported rows using docs/database-integrity.md, then retry the migration.';
  END IF;
END $$;--> statement-breakpoint

ALTER TABLE "deals" DROP CONSTRAINT "deals_currency_uppercase_check";--> statement-breakpoint
ALTER TABLE "deals" DROP CONSTRAINT "deals_closed_at_for_final_stage_check";--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_archive_consistency_check" CHECK ("accounts"."is_archived" = ("accounts"."archived_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_archive_consistency_check" CHECK ("contacts"."is_archived" = ("contacts"."archived_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_completion_consistency_check" CHECK (("crm_tasks"."status" = 'completed') = ("crm_tasks"."completed_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_currency_format_check" CHECK ("deals"."currency" ~ '^[A-Z]{3}$');--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_lost_reason_check" CHECK ("deals"."stage" <> 'lost' OR NULLIF(BTRIM("deals"."lost_reason"), '') IS NOT NULL);--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_closed_at_for_final_stage_check" CHECK (("deals"."stage" IN ('won', 'lost')) = ("deals"."closed_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_archive_consistency_check" CHECK ("leads"."is_archived" = ("leads"."archived_at" IS NOT NULL));
