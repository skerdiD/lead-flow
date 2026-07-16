# Workspace ownership integrity

LeadFlow stores the workspace owner in both `workspaces.owner_user_id` and the
matching `workspace_members` row with role `owner`. Migration
`0014_flimsy_true_believers.sql` makes the workspace owner reference a current
membership through the existing unique `(workspace_id, user_id)` key.

The relationship is `DEFERRABLE INITIALLY DEFERRED` because a workspace is
created before its first membership, and ownership transfer temporarily changes
both representations inside one transaction. The pre-existing deferred
`enforce_workspace_owner_integrity` constraint trigger remains necessary: a
foreign key can prove membership, but cannot prove that the referenced member
has the `owner` role. The trigger enforces exactly one owner membership and
requires it to match `workspaces.owner_user_id` at commit.

Before deployment, run this read-only report against a copy of the target
database. The migration runs equivalent checks and aborts without changing data
when it finds any row.

```sql
SELECT 'owner is not a member' AS problem, workspace.id AS workspace_id,
       workspace.owner_user_id, NULL::varchar AS member_user_id, NULL::workspace_role AS member_role
FROM workspaces workspace
LEFT JOIN workspace_members member
  ON member.workspace_id = workspace.id
  AND member.user_id = workspace.owner_user_id
WHERE member.id IS NULL
UNION ALL
SELECT 'owner membership has wrong role', workspace.id, workspace.owner_user_id,
       member.user_id, member.role
FROM workspaces workspace
JOIN workspace_members member
  ON member.workspace_id = workspace.id
  AND member.user_id = workspace.owner_user_id
WHERE member.role <> 'owner'
UNION ALL
SELECT 'owner membership does not match workspace owner', workspace.id,
       workspace.owner_user_id, member.user_id, member.role
FROM workspaces workspace
JOIN workspace_members member
  ON member.workspace_id = workspace.id
  AND member.role = 'owner'
WHERE member.user_id <> workspace.owner_user_id;
```

The transfer service locks the workspace row with `FOR UPDATE`, then locks the
current-owner and target-member rows. It demotes the old owner, promotes the
target, updates `owner_user_id`, and inserts the audit event in the same
transaction. A simultaneous request waits on the workspace lock and then fails
because its actor is no longer the owner.
