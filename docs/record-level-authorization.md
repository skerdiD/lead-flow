# Record-level authorization

LeadFlow keeps the existing Owner, Admin, and Member roles. The permission
vocabulary and record checks live in `lib/authorization.ts`; UI visibility is
only a convenience layer and is never the authorization boundary.

## Permission matrix

| Permission | Owner | Admin | Member |
| --- | --- | --- | --- |
| View all CRM records | Yes | Yes | No |
| View assigned CRM records | Yes | Yes | Yes |
| Create CRM records | Yes | Yes | Yes |
| Update all CRM records | Yes | Yes | No |
| Update assigned CRM records | Yes | Yes | Yes |
| Delete CRM records | Yes | Yes | No |
| Assign CRM records | Yes | Yes | No |
| View analytics | Yes | Yes | Assignment-scoped |
| Export CRM data | Yes | Yes | No |
| View or manage members | Yes | Yes | No |
| Manage workspace settings | Yes | Yes | No |
| Transfer ownership or delete workspace | Yes | No | No |

## Visibility rules

- Every lookup is scoped to the active, authenticated workspace.
- Leads are visible to Members only when `assignedOwnerUserId` is their user
  id. Unassigned leads are manager-only.
- Deals use `ownerUserId`; tasks use `ownerUserId`, with legacy unassigned
  tasks limited to their creator. For a linked task, the related lead must
  also be assigned to the Member before it is shown. A Member never receives
  another member's task or deal in a list, dashboard aggregate, or direct lead
  route.
- Accounts and contacts are reached only through an already-authorized lead.
  They inherit that lead's visibility; the current product has no standalone
  account or contact route.
- Notes and activity belong to an authorized lead. Members can add notes to
  assigned leads and edit only their own notes. Owners and Admins can manage
  all notes in the workspace.
- Dashboards, attention queues, search/filter results, activity, and exports
  use the same scope. Member exports are denied instead of returning a broader
  report.

## Assignment changes

Only Owners and Admins have `crm:assign`. Member-created leads and tasks are
assigned to the Member creating them. The current UI has no reassignment
control; any future assignment mutation must require `crm:assign` and verify
the target is a member of the active workspace.
