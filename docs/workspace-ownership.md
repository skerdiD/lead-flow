# Workspace ownership integrity

LeadFlow stores workspace ownership only in `workspace_members`. The single row
whose role is `owner` identifies the owner; `workspaces` does not duplicate the
owner user ID.

Two database mechanisms enforce the invariant:

- `workspace_members_one_owner_per_workspace` is a partial unique index that
  prevents more than one `owner` row for a workspace.
- `enforce_workspace_owner_integrity` is a deferred constraint trigger on
  `workspaces` and `workspace_members`. It requires exactly one owner at
  transaction commit, preventing an ownerless workspace or removal/demotion of
  the current owner.

The trigger is deferred because workspace creation must insert the workspace
before its membership, and ownership transfer temporarily demotes the current
owner before promoting the target. Both workflows must run in one transaction.

Migration `0021_membership_owned_workspaces.sql` locks the ownership tables,
rejects conflicting legacy ownership data, backfills or promotes the membership
matching each legacy `workspaces.owner_user_id`, verifies every preserved owner,
and only then removes the old foreign key, index, and column.

Before deployment, this read-only query can identify ownership states that must
be repaired explicitly:

```sql
SELECT workspace.id AS workspace_id,
       count(member.id) FILTER (WHERE member.role = 'owner') AS owner_count,
       array_agg(member.user_id)
         FILTER (WHERE member.role = 'owner') AS owner_user_ids
FROM workspaces workspace
LEFT JOIN workspace_members member ON member.workspace_id = workspace.id
GROUP BY workspace.id
HAVING count(member.id) FILTER (WHERE member.role = 'owner') <> 1;
```

The transfer service locks the workspace row first, then locks the current owner
and target membership rows. It verifies that the actor owns the workspace,
demotes the old owner, promotes the target, and records activity and audit events
in the same transaction. Concurrent transfers serialize on the workspace lock;
after the first commits, the second request observes that its actor is no longer
the owner and fails safely.

Personal and demo workspace creation also runs in one transaction. A
transaction-scoped PostgreSQL advisory lock preserves owner-and-name idempotency
for concurrent creation attempts without reintroducing ownership on the
`workspaces` table.
