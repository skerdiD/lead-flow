ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_role_non_owner" CHECK ("workspace_invitations"."role" <> 'owner');
