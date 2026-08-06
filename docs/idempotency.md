# Mutation idempotency

Lead Flow coordinates retry-safe mutations through `idempotency_records` in
PostgreSQL. The scope is `(workspace, actor, action, idempotency key)` and a
SHA-256 fingerprint of canonicalized validated input prevents a key from being
reused for different work.

Authorization, rate limiting, and validation run before reservation, so an
unauthorized caller cannot consume useful keys. The reservation, business
writes, audit/activity writes, and small replay response share one transaction.
A concurrent insert on the unique scope waits for the winning transaction and
then returns its stored response. A different fingerprint returns a conflict.

Failures are not cached: any thrown error rolls the transaction and reservation
back together. The same key can therefore retry transient or unknown failures.
Completed responses are replayable for seven days. After expiry, a request may
delete and reuse its scoped key as a new operation.

Run `npm run db:cleanup-idempotency` from a daily maintenance job. It deletes at
most 1,000 expired completed records per run (an optional numeric limit may be
passed after `--`) and never deletes active rows. Keeping cleanup bounded avoids
long locks; repeat it until the backlog is empty.

Protected actions are deal creation, lead qualification, lead ownership change,
bulk status/archive operations, workspace ownership transfer, and invitation
acceptance. Their clients generate one UUID for an intentional submission and
retain it while that submission is retried.

The current lead export is a synchronous GET that does not create an export
artifact. It is deliberately not entered in the mutation ledger: faithfully
replaying it would require storing CSV/PDF contents containing CRM personal data,
which the ledger forbids. If exports move to background generation, protect the
job-creation mutation and store only the resulting export-job ID.
