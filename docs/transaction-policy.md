# Transaction policy

LeadFlow treats a CRM mutation as complete only when its required relational
and permanent-history writes have committed. Helpers used by transactional
commands accept the shared `DatabaseClient` surface and callers pass `tx`
explicitly.

## Write classification

| Flow | Required and transactional | Non-critical / after commit | External side effect |
| --- | --- | --- | --- |
| Accounts and contacts | Domain row, primary-contact/ownership relationships, activity, audit | Route revalidation | None |
| Leads | Account/contact/deal relationships, lead row, status changes, activity | In-app notifications, route revalidation | None |
| Deals | Deal/lead status changes, activity; audit for destructive actions | In-app notifications, route revalidation | None |
| Tasks and notes | Domain row, relationship changes, activity; audit for destructive actions | In-app notifications, route revalidation | None |
| Bulk lead actions | Lead changes and their activity entries | Route revalidation | None |
| Imports | Each resumable row batch; completion state, completion activity, and completion audit | Structured progress/error logs | CSV upload request |
| Workspace administration | Invitation/member/ownership writes, assignment cleanup, activity, audit | Cache revalidation | Clerk lookup and invitation email |
| Demo reset/seed | Workspace-scoped fixture graph, activity, and notifications | Structured logs | None |

Operational logs, metrics, and error reporting are best-effort observability and
must not change mutation results. In-app notifications are awaited after commit,
deduplicated by their database key, and logged if storage fails. They are not
written from a domain transaction and are not dispatched with fire-and-forget
promises.

Email and identity-provider calls never run inside database transactions.
Invitation email failure is handled after commit and exposes the already-created
manual invitation link when available.

## Retry and idempotency decisions

- Required activity inserts share the domain transaction, so a failed attempt
  leaves neither the mutation nor a partial timeline entry to duplicate on retry.
- Automatic notifications use the unique
  `(workspace_id, user_id, dedupe_key)` constraint and are safe to retry.
- Audit helpers support unique event keys and use conflict-safe insertion for
  workflows that supply an operation identifier.
- Imports use workspace-scoped idempotency keys and unique staged row numbers.
- General edits intentionally do not deduplicate by entity/action because a user
  may legitimately make the same change more than once. Adding request-level
  idempotency to creates requires a client-supplied operation ID and should not
  be approximated with process memory.

## Transaction boundaries

Validation and authorization that do not depend on mutable state happen before
the transaction. Tenant, record-visibility, and optimistic concurrency
conditions are repeated in mutation queries. Mutable relationship checks are
repeated while the transaction is active; contact updates lock the authorized
contact before changing another contact's primary flag.
