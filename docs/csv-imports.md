# CSV imports

LeadFlow supports deterministic CSV imports for leads, contacts, and accounts at
`/dashboard/import`.

## Access and tenant boundaries

- The centralized `crm:import` permission is granted to workspace owners and
  admins.
- Members cannot create, review, confirm, or view import jobs.
- The public demo workspace is read-only and rejects imports server-side.
- Every job, staged row, relationship lookup, duplicate lookup, insert, update,
  history query, and rejected-row download is scoped to the authenticated
  active workspace. The client never supplies a trusted workspace ID.

## Practical limits

- CSV and UTF-8 only.
- Maximum file size: 2 MB.
- Maximum data rows: 2,000.
- Maximum columns: 60.
- Maximum cell length: 5,000 characters.
- Preview page size: 25 rows.
- Processing batch size: 100 rows.

These limits keep the synchronous workflow compatible with the current
deployment. LeadFlow does not claim to have a durable background queue.

## Processing and idempotency

Upload creates a server-owned draft job and staged row records. Confirmation
uses that persisted job rather than trusting normalized data sent back by the
browser. Each job has a server-generated idempotency key protected by a
workspace-scoped unique constraint. A completed confirmation returns the
existing result, and concurrent confirmations cannot claim the same reviewed
job twice.

Rows are processed in transactions of up to 100. If a batch encounters an
unexpected row-level problem, LeadFlow retries each row in its own transaction,
records safe failures, and continues. System-level failures stop the job and
leave already committed row outcomes intact for a safe retry.

## Duplicate rules

- Leads: normalized email when present.
- Contacts: normalized email when present.
- Accounts: normalized account name.

Duplicates are checked inside the CSV and against the active workspace. Update
mode is available only for exact existing matches. Blank CSV cells do not erase
existing fields. Within-file duplicates are skipped in update mode because they
do not identify a stable existing database target.

## Relationships

Account names, primary-contact emails, and assigned-member emails use exact
normalized matching inside the active workspace. Missing or ambiguous matches
are rejected. The importer never creates hidden related records.

## Retention

The original file is not stored. Parsed raw and normalized staged row data is
kept in PostgreSQL for seven days to support review and rejected-row downloads.
Cleanup runs opportunistically when an authorized user starts another import.
The job summary and structured audit metadata remain after staged rows expire.

Rejected CSV downloads neutralize cells beginning with `=`, `+`, `-`, or `@` to
reduce spreadsheet formula-injection risk.
