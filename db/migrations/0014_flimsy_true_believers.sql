-- The preflight only reports invalid ownership states. Ownership is never
-- guessed or repaired automatically because the correct owner is a business
-- decision for each workspace.
DO $$
DECLARE
  violations jsonb;
BEGIN
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object('rule', rule, 'invalid_rows', invalid_rows)
    ) FILTER (WHERE invalid_rows > 0),
    '[]'::jsonb
  )
  INTO violations
  FROM (
    SELECT 'workspace owner is not a member' AS rule, count(*) AS invalid_rows
    FROM workspaces workspace
    LEFT JOIN workspace_members member
      ON member.workspace_id = workspace.id
      AND member.user_id = workspace.owner_user_id
    WHERE member.id IS NULL
    UNION ALL
    SELECT 'workspace owner membership does not have owner role', count(*)
    FROM workspaces workspace
    INNER JOIN workspace_members member
      ON member.workspace_id = workspace.id
      AND member.user_id = workspace.owner_user_id
    WHERE member.role <> 'owner'
    UNION ALL
    SELECT 'workspace has no owner membership', count(*)
    FROM workspaces workspace
    LEFT JOIN workspace_members member
      ON member.workspace_id = workspace.id
      AND member.role = 'owner'
    WHERE member.id IS NULL
    UNION ALL
    SELECT 'owner membership does not match workspaces.owner_user_id', count(*)
    FROM workspaces workspace
    INNER JOIN workspace_members member
      ON member.workspace_id = workspace.id
      AND member.role = 'owner'
    WHERE member.user_id <> workspace.owner_user_id
    UNION ALL
    SELECT 'workspace has multiple owner memberships', count(*)
    FROM (
      SELECT workspace_id
      FROM workspace_members
      WHERE role = 'owner'
      GROUP BY workspace_id
      HAVING count(*) > 1
    ) AS duplicate_owners
  ) AS ownership_integrity_checks;

  IF violations <> '[]'::jsonb THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Workspace ownership preflight failed; no constraints were changed.',
      DETAIL = violations::text,
      HINT = 'Use the diagnostic queries in docs/workspace-ownership.md to inspect and explicitly repair each workspace before retrying this migration.';
  END IF;
END $$;
--> statement-breakpoint

-- workspace_members_workspace_user_unique already exists and is the required
-- non-partial unique key for this composite relationship. The partial owner
-- index is also retained from migration 0009.
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_member_fk" FOREIGN KEY ("id", "owner_user_id") REFERENCES "public"."workspace_members"("workspace_id", "user_id") DEFERRABLE INITIALLY DEFERRED;
