# Observability and audit records

LeadFlow uses three deliberately separate systems:

- Operational logs are structured server-only JSON/object logs for request failures, security rejections, application metrics, and slow database operations.
- Activity events are concise, human-readable CRM timeline entries.
- Audit records are workspace-scoped, structured security history. They preserve actor role, action, entity, field-level before/after differences, a request ID, and only safe metadata.

## Runtime configuration

`SLOW_QUERY_THRESHOLD_MS` is optional and defaults to `500`. `AUDIT_IP_HASH_SALT` is optional; when configured alongside a supplied request, it allows a one-way IP hash to be stored instead of an IP address. `VERCEL_GIT_COMMIT_SHA` is optional and appears as the short build version in `/api/health`.

No error provider is required. The provider-neutral reporter logs unexpected failures and can be connected to a monitoring SDK without changing product behavior. Domain errors are intentionally not reported as crashes.

## Health and requests

The proxy accepts only UUID-shaped `X-Request-Id` values, otherwise creates a cryptographically random UUID. It forwards the ID into server work and returns it in the response header. `/api/health` performs a bounded `select 1` readiness check (1.5 seconds), returns only `ok` or `unavailable`, and never returns connection information.

## Audit retention and immutability

Normal application code exposes no audit update/delete mutation. Audit rows intentionally do not reference a deletable workspace row, so a workspace deletion does not cascade away its evidence. The owner/admin viewer is server-authorized with `workspace:manage`; members receive a not-found response.

Retain audit data for at least 12 months while the product remains small. The workspace/date, actor/date, action, and entity/date indexes match viewer queries. Reassess retention and move older rows to encrypted archival storage as tenant count grows. Audit payloads are centrally redacted; do not use them for unrestricted note bodies, credentials, invite tokens, or authentication data.
