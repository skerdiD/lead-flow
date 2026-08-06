# Server-side authorization audit

Date: 2026-08-06

## Executive summary

The audit reviewed every server action, route handler, protected server query,
workspace/member/invitation operation, import/export path, demo/test endpoint,
and the lower-level helpers those surfaces call. UI visibility was not treated
as an authorization control.

No endpoint was found to rely only on a hidden or disabled UI control. Five
defense gaps were found and fixed: import relationships were not revalidated at
confirmation time, several import child updates were scoped only by an ID,
the workspace-team helper trusted a caller-provided workspace object, lead
reassignment had a membership time-of-check/time-of-use gap, and successful
exports were not audited.

The resulting policy is:

- Authentication and active-workspace membership are derived on the server.
- Capabilities come from `lib/authorization.ts`; client workspace/role values
  are never authoritative.
- Record reads and writes include the authorized workspace and, for Members,
  assignment predicates.
- Related account/contact/lead/deal/task/member IDs are resolved inside the
  active workspace. Composite tenant foreign keys provide an additional
  database boundary for CRM relationships.
- Missing, cross-workspace, and unauthorized resources use the same safe
  not-found/permission response and do not disclose tenant existence.

## Surfaces reviewed

### Route handlers and API endpoints

| Surface | Authorization result |
| --- | --- |
| `GET /api/leads/export` | Authenticated active-workspace context, `exports:create`, record visibility predicates, workspace-scoped selected IDs and filters; now audited. |
| `POST /api/imports` | Authenticated active workspace, `crm:import`, demo mutation block, server-owned workspace/job creation. |
| `GET/PATCH /api/imports/[id]` | `crm:import`; job and staged rows scoped to active workspace; review also requires the creating actor. |
| `POST /api/imports/[id]/confirm` | `crm:import`; active-workspace and actor-owned job claim; persisted mappings used; relationships revalidated during each write. |
| `GET /api/imports/[id]/rejected` | `crm:import`; job and rejected rows scoped to active workspace; safe CSV generation. |
| `GET /api/imports/templates/[entityType]` | `crm:import`; allowlisted entity type; no workspace input accepted. |
| `POST /api/demo-login` | Intentionally public; allowlisted one-field role payload, rate protection, configured Clerk identity and exact demo membership verification. |
| `GET /api/health` | Intentionally public readiness endpoint; no tenant data returned. |
| `POST /api/testing/e2e/reset` | Non-production E2E mode plus a required secret; otherwise 404. |
| `POST /api/testing/e2e/notifications` | Non-production E2E mode plus a required secret; otherwise 404; target workspace is resolved from the test user's membership. |

### Server actions

Reviewed all exports in:

- `app/dashboard/crm-actions.ts`: account/contact/deal create, update,
  archive/delete, relationship selection, ownership selection, deal movement.
- `app/dashboard/leads/actions/**`: lead create/update/archive/restore, bulk
  status/delete, notes, follow-ups, tasks, qualification, deal stage changes,
  and owner reassignment.
- `app/dashboard/tasks/actions.ts`: complete, reopen, and delete.
- `app/dashboard/notifications/actions.ts`: dropdown reads and read-state
  mutations, scoped by workspace and recipient user.
- `app/dashboard/settings/actions.ts`: invitations, member role changes,
  removal, ownership transfer, workspace deletion, and invitation acceptance.

Every mutation derives the user and active workspace server-side and checks
the matching CRM or workspace permission. Record mutations use workspace and
assignment predicates in the final update/delete, not only in a preliminary
lookup.

### Protected queries and helpers

Reviewed dashboard, lead detail/list, account/contact, deal, task, activity,
notification, member-profile, team, import-history, audit-log, export-builder,
invitation, ownership-transfer, activity/audit writer, demo-auth, demo seeding,
workspace creation/selection, and notification-recipient helpers.

The audit-log query was moved to `lib/audit-log-query.server.ts` so the helper
itself enforces authenticated active-workspace resolution and
`workspace:manage`; it does not depend on the page hiding the link.

`getWorkspaceTeam` now resolves its own authorization context. It no longer
accepts a workspace object from its caller.

## Vulnerabilities found and changes made

### 1. Import relationships could become stale between review and confirm

Severity: Medium.

Review correctly resolved owner emails, account names, and primary-contact
emails inside the active workspace. Confirmation used the persisted IDs, but
did not re-check them inside the write transaction. A member could be removed
or a related record archived after review; a tampered staged row would also
have reached the write path and relied primarily on database constraints.

Fix:

- Added `lib/imports/relationships.server.ts`.
- Each pending row now revalidates `assignedOwnerUserId`, `accountId`, and
  `primaryContactId` against the server-owned job workspace in the same
  transaction that writes the CRM record.
- Missing, archived, or cross-workspace relationships fail with one generic
  error and the row is recorded as failed without database details.

### 2. Import child/job maintenance used globally unique IDs without redundant tenant predicates

Severity: Low (defense in depth; UUID uniqueness and prior authorized job
loading limited exploitability).

Fix:

- Review, row-state, failed-row, count-refresh, completion, and failure updates
  now include both `workspaceId` and `importJobId`/actor where applicable.
- The opportunistic staged-data purge is now private to the authorized import
  service and cannot be called externally with an arbitrary workspace ID.

### 3. Workspace team/profile helpers trusted a supplied workspace ID or object

Severity: Medium if the helper were reused from a route with client-derived
input; current page passed a server-resolved object.

Fix:

- `getWorkspaceTeam` and member-profile resolution now call the centralized
  current-workspace authorization context themselves. Team listing checks
  `members:view`; profile resolution limits Members to their own identity.
- Callers can no longer supply a workspace or role. Profile ID requests are
  intersected with the caller's server-authorized visibility.

### 4. Owner assignment had a membership race and lead reassignment lacked an audit event

Severity: Low.

Some account/contact/deal forms and the explicit lead-owner action checked that
the requested owner was a member before starting the mutation transaction.
Removal between those operations could leave a stale owner because owner
columns intentionally are not foreign keys to membership.

Fix:

- Re-check and share-lock target membership inside account/contact/deal and
  lead-owner mutation transactions. Qualification already runs its checks in
  one transaction and now share-locks the owner membership too.
- Keep the lead update workspace/assignment-scoped.
- Record the before/after owner IDs as a redacted `lead.updated` audit event in
  the same transaction.
- Deal creation rechecks related-record visibility in the write transaction.

### 5. Successful exports were not recorded in the audit log

Severity: Low (detectability/accountability gap).

Fix:

- Successful CSV/PDF exports now write `export.created` with actor, active
  workspace, format, row count, selected count, and boolean filter indicators.
- Search text, selected IDs, owner IDs, generated contents, and other sensitive
  filter values are not written to audit metadata.
- Deal creation and stage movement also now record their existing structured
  `deal.created` and `deal.stage_changed` audit actions transactionally.

## Export review

- Requires `exports:create`; Members are denied before the lead query.
- Workspace comes exclusively from the authenticated current-workspace
  context. A `workspaceId` query parameter is ignored.
- Selected UUIDs add an ID predicate to the existing workspace/assignment
  predicates; they do not replace tenant scope.
- Search/status/source/owner/archive/sort inputs are normalized and converted
  into parameterized Drizzle predicates. Invalid sort/status values fall back
  to allowlisted defaults.
- Output selects only customer-facing lead fields. It excludes workspace IDs,
  creator/owner IDs, notes, request IDs, tokens, and internal import/audit data.
- CSV cells are spreadsheet-formula neutralized and both formats are returned
  with `no-store` and `nosniff`.

## Import review

- Requires `crm:import` for upload, template, review, history/detail,
  confirmation, and rejected-row download.
- The server creates the job workspace and actor; neither can be supplied by
  the browser.
- Mapping fields, entity types, duplicate strategies, file size/shape, and
  normalized values are allowlisted and bounded.
- Duplicate and relationship lookups are active-workspace scoped.
- Confirmation uses persisted server-reviewed rows, revalidates all
  relationships, and scopes updates to the job workspace.
- Composite workspace foreign keys prevent cross-tenant account/contact/lead,
  deal, task, note, activity, and import-row relationships at the database
  layer.

## Invitation, member, and ownership review

- Invitation tokens contain 256 bits of randomness; only SHA-256 hashes are
  stored. Acceptance accepts no client email, role, or workspace value.
- Acceptance atomically claims only a pending, unexpired token and records the
  accepting user. A thrown email/membership error rolls back the claim.
- Reuse and concurrent acceptance are rejected; invitation roles cannot be
  `owner` by application validation and database check constraint.
- Member role/removal targets are queried by both membership ID and active
  workspace. Normal management cannot change/remove an owner or assign owner.
- Ownership transfer rechecks and locks the workspace, current owner, and
  target membership; it verifies the actor is still the sole owner and the
  target belongs to that workspace. The database enforces exactly one owner at
  commit.
- Workspace deletion re-locks the workspace and owner membership before
  deletion and records the audit event transactionally.

## Negative tests

Direct, non-UI coverage includes:

| Attack case | Coverage |
| --- | --- |
| Unauthenticated user | `app/api/leads/export/route.test.ts` calls the route and verifies no query/file generation. |
| Authenticated non-member | Export route test simulates active-workspace resolution denial before data access. |
| Member without permission | Export route and `lib/audit-log-query.server.test.ts` deny before database access; the central permission matrix also covers every role. |
| Workspace A accessing resource B | Lead action/qualification tests plus `db/integration/tenant-integrity.test.ts` and authorization policy tests. |
| Modified workspace ID | Export route test supplies an attacker workspace and verifies use of only the server-authorized workspace. |
| Modified owner ID | Lead ownership/qualification tests reject non-members; reassignment now rechecks membership transactionally. |
| Modified export filters/selected IDs | Export route test changes owner/search/selected/workspace parameters and verifies tenant scope and non-sensitive audit metadata. |
| Modified import relationships | `lib/imports/relationships.server.test.ts` directly verifies active-workspace predicates and rejection; `db/integration/import-integrity.test.ts` supplies another workspace's owner/account/contact. |
| Direct ownership transfer | Settings action test rejects Admin; ownership integration tests reject non-owner actors and cross-workspace targets. |
| Direct audit-log call | `lib/audit-log-query.server.test.ts` rejects Member before querying and verifies the active-workspace predicate for Admin. |
| Reused invitation | Invitation integration test accepts once, rejects reuse, and verifies membership exists only in the token's workspace. |
| Expired invitation | Existing invitation integration test rejects an expired pending token. |

Database-backed integration tests are conditional on `TEST_DATABASE_URL` and
refuse to run unless the database name is clearly a test/CI database.

## Remaining risks

- PostgreSQL row-level security is not enabled. Tenant isolation is enforced by
  application predicates plus composite constraints. A future raw SQL feature
  must follow the same active-workspace policy and should be added to this
  audit matrix.
- Owner user columns are not membership foreign keys because member removal
  intentionally unassigns records. Assignment entry points must continue to
  validate membership transactionally; the audited current entry points do so
  or assign the authenticated actor.
- Full database-backed negative tests require CI to provide
  `TEST_DATABASE_URL`; without it Vitest reports those suites as skipped.
- Clerk supplies verified email and profile identity. Provider outages fail
  invitation acceptance/profile enrichment safely, but this remains an
  external trust dependency.
- There is no unrestricted audit-log export or report-generation endpoint.
  Any future endpoint must require an explicit capability, apply active
  workspace scope, minimize fields, and produce its own audit event.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd test`
- `npm.cmd run build`

At audit completion, lint, typecheck, and the production build passed; Vitest
reported 165 passing tests. The 44 database-backed tests remain gated by
`TEST_DATABASE_URL` and were skipped locally as described above.
