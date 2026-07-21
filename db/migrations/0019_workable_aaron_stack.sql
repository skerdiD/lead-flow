-- Do not make an irreversible data choice in a schema migration. Surface every
-- tenant-scoped duplicate so it can be resolved before the invariant is added.
-- The lock also prevents a new duplicate from being written between this check
-- and the constraint creation.
LOCK TABLE "deals" IN SHARE ROW EXCLUSIVE MODE;--> statement-breakpoint
DO $$
DECLARE
  duplicate_groups jsonb;
BEGIN
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'workspace_id', workspace_id,
        'lead_id', lead_id,
        'deal_ids', deal_ids
      )
    ),
    '[]'::jsonb
  )
  INTO duplicate_groups
  FROM (
    SELECT workspace_id, lead_id, array_agg(id ORDER BY created_at, id) AS deal_ids
    FROM deals
    WHERE lead_id IS NOT NULL
    GROUP BY workspace_id, lead_id
    HAVING count(*) > 1
  ) AS duplicate_deals;

  IF jsonb_array_length(duplicate_groups) > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'Cannot enforce one deal per lead while duplicate deals exist.',
      DETAIL = duplicate_groups::text,
      HINT = 'Choose the canonical deal for each workspace_id and lead_id pair, then rerun this migration.';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_workspace_lead_unique" UNIQUE("workspace_id","lead_id");--> statement-breakpoint
DROP INDEX "deals_workspace_id_lead_id_idx";
