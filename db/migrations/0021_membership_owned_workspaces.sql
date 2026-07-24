-- Keep ownership stable while legacy owner_user_id values are validated and
-- converted into the membership-owned representation.
LOCK TABLE "workspaces", "workspace_members" IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint

-- A different owner membership is ambiguous and must be resolved by a human;
-- choosing either value automatically could transfer ownership silently.
DO $$
DECLARE
  violations jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(problem), '[]'::jsonb)
  INTO violations
  FROM (
    SELECT jsonb_build_object(
      'workspace_id', workspace.id,
      'legacy_owner_user_id', workspace.owner_user_id,
      'membership_owner_user_id', member.user_id,
      'problem', 'owner membership conflicts with legacy owner_user_id'
    ) AS problem
    FROM workspaces workspace
    INNER JOIN workspace_members member
      ON member.workspace_id = workspace.id
      AND member.role = 'owner'::"public"."workspace_role"
    WHERE member.user_id <> workspace.owner_user_id
  ) ownership_conflicts;

  IF violations <> '[]'::jsonb THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Workspace ownership migration found conflicting owner data.',
      DETAIL = violations::text,
      HINT = 'Resolve each conflicting owner explicitly before retrying the migration.';
  END IF;
END $$;
--> statement-breakpoint

-- Preserve every legacy owner. This inserts a missing membership or promotes
-- the matching existing membership before owner_user_id is removed.
INSERT INTO "workspace_members" ("workspace_id", "user_id", "role")
SELECT workspace.id, workspace.owner_user_id, 'owner'::"public"."workspace_role"
FROM workspaces workspace
ON CONFLICT ("workspace_id", "user_id") DO UPDATE
SET "role" = 'owner'::"public"."workspace_role";
--> statement-breakpoint

-- Fail closed unless every workspace now has exactly one owner membership and
-- that membership contains the owner preserved from the legacy column.
DO $$
DECLARE
  violations jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(problem), '[]'::jsonb)
  INTO violations
  FROM (
    SELECT jsonb_build_object(
      'workspace_id', workspace.id,
      'legacy_owner_user_id', workspace.owner_user_id,
      'owner_count', count(member.id),
      'problem', 'workspace must have exactly one matching owner membership'
    ) AS problem
    FROM workspaces workspace
    LEFT JOIN workspace_members member
      ON member.workspace_id = workspace.id
      AND member.role = 'owner'::"public"."workspace_role"
    GROUP BY workspace.id, workspace.owner_user_id
    HAVING count(member.id) <> 1
      OR bool_or(member.user_id = workspace.owner_user_id) IS NOT TRUE
  ) invalid_ownership;

  IF violations <> '[]'::jsonb THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Workspace ownership migration could not preserve all owners.',
      DETAIL = violations::text,
      HINT = 'Inspect workspace_members and repair the reported workspaces before retrying.';
  END IF;
END $$;
--> statement-breakpoint

-- Membership role is now the single ownership source. The deferred trigger
-- permits workspace creation and transfer to make temporary changes inside a
-- transaction, but rejects zero owners when that transaction commits.
CREATE OR REPLACE FUNCTION "public"."enforce_workspace_owner_integrity"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_workspace_id uuid;
  v_workspace_ids uuid[];
BEGIN
  IF TG_TABLE_NAME = 'workspaces' THEN
    v_workspace_ids := ARRAY[COALESCE(NEW."id", OLD."id")];
  ELSIF TG_OP = 'UPDATE' THEN
    -- Moving a membership can affect both tenants. Validate both so an owner
    -- cannot be moved away while leaving the previous workspace ownerless.
    v_workspace_ids := ARRAY[OLD."workspace_id", NEW."workspace_id"];
  ELSE
    v_workspace_ids := ARRAY[COALESCE(NEW."workspace_id", OLD."workspace_id")];
  END IF;

  FOREACH v_workspace_id IN ARRAY v_workspace_ids LOOP
    IF NOT EXISTS (SELECT 1 FROM "workspaces" WHERE "id" = v_workspace_id) THEN
      CONTINUE;
    END IF;

    IF (
      SELECT count(*)
      FROM "workspace_members"
      WHERE "workspace_id" = v_workspace_id
        AND "role" = 'owner'::"public"."workspace_role"
    ) <> 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Workspace must have exactly one owner membership.';
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;
--> statement-breakpoint

ALTER TABLE "workspaces" DROP CONSTRAINT "workspaces_owner_member_fk";
--> statement-breakpoint
DROP INDEX "workspaces_owner_name_unique";--> statement-breakpoint
CREATE INDEX "workspaces_name_idx" ON "workspaces" USING btree ("name");--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "owner_user_id";
