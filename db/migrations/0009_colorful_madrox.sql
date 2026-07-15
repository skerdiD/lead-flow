CREATE TYPE "public"."workspace_invitation_status" AS ENUM('pending', 'accepted', 'revoked');--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'member_invited';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'invitation_accepted';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'member_removed';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'member_role_changed';--> statement-breakpoint
ALTER TYPE "public"."activity_event_type" ADD VALUE 'ownership_transferred';--> statement-breakpoint
ALTER TYPE "public"."workspace_role" ADD VALUE 'admin' BEFORE 'member';--> statement-breakpoint
CREATE TABLE "workspace_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "workspace_role" DEFAULT 'member' NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"status" "workspace_invitation_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by_user_id" varchar(255),
	"created_by_user_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_invitations_token_hash_unique" ON "workspace_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "workspace_invitations_workspace_status_idx" ON "workspace_invitations" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "workspace_invitations_workspace_email_idx" ON "workspace_invitations" USING btree ("workspace_id","email");--> statement-breakpoint
CREATE INDEX "workspace_members_workspace_role_idx" ON "workspace_members" USING btree ("workspace_id","role");
--> statement-breakpoint
-- Preserve legacy owners and repair only pre-existing inconsistent memberships before
-- enabling the one-owner constraint.
UPDATE "workspace_members" AS member
SET "role" = 'member'::"public"."workspace_role"
FROM "workspaces" AS workspace
WHERE member."workspace_id" = workspace."id"
	AND member."role" = 'owner'::"public"."workspace_role"
	AND member."user_id" <> workspace."owner_user_id";
--> statement-breakpoint
INSERT INTO "workspace_members" ("workspace_id", "user_id", "role")
SELECT workspace."id", workspace."owner_user_id", 'owner'::"public"."workspace_role"
FROM "workspaces" AS workspace
ON CONFLICT ("workspace_id", "user_id") DO UPDATE
SET "role" = 'owner'::"public"."workspace_role";
--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_one_owner_per_workspace" ON "workspace_members" USING btree ("workspace_id") WHERE "role" = 'owner'::"public"."workspace_role";
--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_invitations_one_pending_email" ON "workspace_invitations" USING btree ("workspace_id", "email") WHERE "status" = 'pending'::"public"."workspace_invitation_status";
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."enforce_workspace_owner_integrity"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	v_workspace_id uuid;
BEGIN
	IF TG_TABLE_NAME = 'workspaces' THEN
		v_workspace_id := COALESCE(NEW."id", OLD."id");
	ELSE
		v_workspace_id := COALESCE(NEW."workspace_id", OLD."workspace_id");
	END IF;

	IF NOT EXISTS (SELECT 1 FROM "workspaces" WHERE "id" = v_workspace_id) THEN
		RETURN NULL;
	END IF;

	IF (SELECT count(*) FROM "workspace_members" WHERE "workspace_id" = v_workspace_id AND "role" = 'owner'::"public"."workspace_role") <> 1
		OR NOT EXISTS (
			SELECT 1
			FROM "workspace_members" AS member
			INNER JOIN "workspaces" AS workspace ON workspace."id" = member."workspace_id"
			WHERE member."workspace_id" = v_workspace_id
				AND member."user_id" = workspace."owner_user_id"
				AND member."role" = 'owner'::"public"."workspace_role"
		) THEN
		RAISE EXCEPTION 'Workspace must have exactly one owner.';
	END IF;

	RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "workspace_members_owner_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "workspace_members"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "public"."enforce_workspace_owner_integrity"();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "workspaces_owner_integrity"
AFTER INSERT OR UPDATE OR DELETE ON "workspaces"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "public"."enforce_workspace_owner_integrity"();
