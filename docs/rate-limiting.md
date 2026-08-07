# Action-sensitive rate limiting

All server boundaries use `enforceRateLimit` from `lib/arcjet.ts`; numerical limits live only in `lib/rate-limit-policies.ts`. Arcjet is the shared provider, so counters are effective across application instances rather than being held in process memory.

## Policies

| Action | Limit | Window | Rationale |
| --- | ---: | ---: | --- |
| Authenticated read | 300 | 1 minute | Allows normal navigation and concurrent server rendering. |
| CRM create (lead/contact/account/deal/task) | 30 | 1 minute | Supports quick entry and integrations while containing write abuse. |
| Other CRM mutation | 120 | 1 minute | Allows ordinary workflow changes without using the read-sized bucket. |
| Bulk CRM operation | 10 | 5 minutes | One request can change many records. |
| Export | 5 | 10 minutes | Exports are data-sensitive and CPU/database intensive. |
| CSV import | 3 | 10 minutes | Imports allocate storage and can trigger large write batches. |
| Invitation create/resend | 5 | 1 hour | Limits email abuse and invitation churn. Resending replaces a pending invitation through the same protected action. |
| Invitation accept | 10 | 10 minutes | Restricts authentication-adjacent token attempts. |
| Ownership transfer | 3 | 1 hour | A rare, high-impact privileged action. |
| AI operation | 5 | 10 minutes | Very strict cost/abuse default, ready for an AI boundary when one is added. |
| Demo login | 5 | 10 minutes | Very strict because it provisions an authentication session. |
| Other authentication-sensitive action | 10 | 10 minutes | Conservative default for future local authentication boundaries. |
| Expensive analytics | 30 | 5 minutes | Lower throughput than ordinary reads because each page executes several aggregates. |

## Key strategy

Authenticated keys are an HMAC digest of the policy version, action, authenticated Clerk user ID, and server-resolved workspace ID. They are never based on IP alone. User and workspace changes therefore isolate buckets, while query strings, form fields, record IDs, and other insignificant request data cannot create a fresh bucket.

Unauthenticated keys are an HMAC digest of the action and client IP. The raw IP is used only in memory to calculate that digest; it is not logged or sent as the custom Arcjet characteristic. Configure `RATE_LIMIT_KEY_SECRET` as a stable random secret shared by every instance. If absent, `ARCJET_KEY` is used as the HMAC secret. Client-IP headers must be overwritten by the deployment's trusted proxy; do not pass arbitrary client-supplied forwarding headers through unchanged.

## Failure behavior

A rate-limit denial returns HTTP 429 from route handlers and includes `Retry-After` when Arcjet supplies a reset time. Server actions return the same neutral message in their typed action result. Logs contain the action and request ID, not request bodies, record data, raw IPs, keys, or policy details.

Arcjet normally fails open and reports provider errors. Lead Flow explicitly fails closed with a temporary 503 for demo login, invitation acceptance, and future authentication-sensitive actions. Ordinary reads and authenticated business actions fail open during a provider outage so a protection dependency cannot halt CRM work. Both paths emit an operational error log. Shield or bot denials remain HTTP 403 rather than being misreported as rate limits.

Static assets, health checks, rendering helpers, and harmless internal component work are not rate limited.

## Protected boundaries

- Demo login
- Lead, account, contact, deal, and follow-up task creation
- Lead bulk status/archive operations
- Workspace invitation creation/resend and acceptance
- CSV upload, review, and confirmation
- Lead and rejected-row exports
- Workspace ownership transfer
- Dashboard aggregate analytics

No AI operation currently exists. The typed `ai:operation` policy must be applied at its server boundary when one is introduced.
