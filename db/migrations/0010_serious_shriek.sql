DROP INDEX "workspaces_owner_user_id_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_owner_name_unique" ON "workspaces" USING btree ("owner_user_id","name");