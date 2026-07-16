# Database integrity checks

Migration `0013_red_victor_mancha.sql` replaces the old single-column foreign
keys with composite `(workspace_id, id)` foreign keys. A child can therefore
only reference a parent from its own workspace, even if application code passes
a real ID from another tenant.

The migration deliberately drops the old single-column foreign keys. Keeping
both would not add protection, and the old keys would incorrectly permit a
cross-workspace ID whenever it existed in the parent table.

Before adding constraints, the migration checks every existing relationship and
deal invariant, then aborts without changing constraints if it finds a mismatch.
The error detail contains the affected rule and count. It never changes those
rows automatically.

To inspect the exact rows before deploying, run this read-only report against a
copy of the target database:

```sql
SELECT 'contacts.account_id -> accounts.id' AS relationship, child.id AS child_id,
       child.workspace_id AS child_workspace_id, parent.workspace_id AS parent_workspace_id
FROM contacts child JOIN accounts parent ON parent.id = child.account_id
WHERE child.workspace_id <> parent.workspace_id
UNION ALL
SELECT 'leads.account_id -> accounts.id', child.id, child.workspace_id, parent.workspace_id
FROM leads child JOIN accounts parent ON parent.id = child.account_id
WHERE child.workspace_id <> parent.workspace_id
UNION ALL
SELECT 'leads.primary_contact_id -> contacts.id', child.id, child.workspace_id, parent.workspace_id
FROM leads child JOIN contacts parent ON parent.id = child.primary_contact_id
WHERE child.workspace_id <> parent.workspace_id
UNION ALL
SELECT 'deals.lead_id -> leads.id', child.id, child.workspace_id, parent.workspace_id
FROM deals child JOIN leads parent ON parent.id = child.lead_id
WHERE child.workspace_id <> parent.workspace_id
UNION ALL
SELECT 'deals.account_id -> accounts.id', child.id, child.workspace_id, parent.workspace_id
FROM deals child JOIN accounts parent ON parent.id = child.account_id
WHERE child.workspace_id <> parent.workspace_id
UNION ALL
SELECT 'deals.contact_id -> contacts.id', child.id, child.workspace_id, parent.workspace_id
FROM deals child JOIN contacts parent ON parent.id = child.contact_id
WHERE child.workspace_id <> parent.workspace_id
UNION ALL
SELECT 'crm_tasks.lead_id -> leads.id', child.id, child.workspace_id, parent.workspace_id
FROM crm_tasks child JOIN leads parent ON parent.id = child.lead_id
WHERE child.workspace_id <> parent.workspace_id
UNION ALL
SELECT 'crm_tasks.deal_id -> deals.id', child.id, child.workspace_id, parent.workspace_id
FROM crm_tasks child JOIN deals parent ON parent.id = child.deal_id
WHERE child.workspace_id <> parent.workspace_id
UNION ALL
SELECT 'crm_tasks.contact_id -> contacts.id', child.id, child.workspace_id, parent.workspace_id
FROM crm_tasks child JOIN contacts parent ON parent.id = child.contact_id
WHERE child.workspace_id <> parent.workspace_id
UNION ALL
SELECT 'lead_notes.lead_id -> leads.id', child.id, child.workspace_id, parent.workspace_id
FROM lead_notes child JOIN leads parent ON parent.id = child.lead_id
WHERE child.workspace_id <> parent.workspace_id
UNION ALL
SELECT 'activity_events.lead_id -> leads.id', child.id, child.workspace_id, parent.workspace_id
FROM activity_events child JOIN leads parent ON parent.id = child.lead_id
WHERE child.workspace_id <> parent.workspace_id;
```

For composite relationships that previously used `ON DELETE SET NULL`, the
migration uses PostgreSQL's column list syntax, such as `ON DELETE SET NULL
(account_id)`. This preserves the non-null `workspace_id` while nulling only
the optional relationship ID. Drizzle models the relationship and its set-null
intent; the migration supplies PostgreSQL's more precise column-list form.

Run `npm run test:db` only with `TEST_DATABASE_URL` set to a dedicated database
whose name includes `test` or `ci`. CI runs migrations before this suite.
