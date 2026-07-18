import { describe, expect, it } from "vitest";
import {
  getCreateActionsForUser,
  getPrimaryNavigationForUser,
  getSecondaryNavigationForUser,
  getSettingsNavigationForUser,
  isNavigationItemActive,
  type NavigationContext,
} from "@/components/dashboard/dashboard-nav";
import {
  hasWorkspacePermission,
  workspacePermissions,
  type WorkspaceRole,
} from "@/lib/authorization";

function contextFor(role: WorkspaceRole, isDemoWorkspace = false): NavigationContext {
  return {
    permissions: workspacePermissions.filter((permission) =>
      hasWorkspacePermission(role, permission),
    ),
    isDemoWorkspace,
  };
}

const primaryLabels = ["Dashboard", "Leads", "Deals", "Customers", "Tasks"];

describe("role-aware dashboard navigation", () => {
  it.each(["owner", "admin", "member"] as const)(
    "shows the compact daily navigation for %s users",
    (role) => {
      const items = getPrimaryNavigationForUser(contextFor(role));

      expect(items.map((item) => item.label)).toEqual(primaryLabels);
      expect(items).toHaveLength(5);
      expect(items.map((item) => item.label)).not.toEqual(
        expect.arrayContaining(["Add Lead", "Import", "Activity", "Audit Log"]),
      );
      expect(getSecondaryNavigationForUser(contextFor(role)).map((item) => item.label)).toEqual([
        "Settings",
      ]);
    },
  );

  it("shows Owner settings backed by implemented permissions", () => {
    expect(getSettingsNavigationForUser(contextFor("owner")).map((item) => item.label)).toEqual([
      "Profile",
      "Access & security",
      "Team & roles",
      "Data & imports",
      "Workspace activity",
      "Audit log",
    ]);
  });

  it("keeps Owner-only settings out of the Admin experience", () => {
    const labels = getSettingsNavigationForUser(contextFor("admin")).map((item) => item.label);

    expect(labels).toContain("Team & roles");
    expect(labels).toContain("Data & imports");
    expect(labels).toContain("Audit log");
    expect(labels).not.toEqual(expect.arrayContaining(["Ownership", "Billing"]));
  });

  it("limits Member settings to personal and assignment-safe destinations", () => {
    const labels = getSettingsNavigationForUser(contextFor("member")).map((item) => item.label);

    expect(labels).toEqual(["Profile", "Access & security", "Workspace activity"]);
    expect(labels).not.toEqual(
      expect.arrayContaining(["Team & roles", "Data & imports", "Audit log", "Ownership", "Billing"]),
    );
  });

  it.each(["owner", "admin", "member"] as const)(
    "shows only implemented create destinations for %s users",
    (role) => {
      expect(getCreateActionsForUser(contextFor(role)).map((item) => item.label)).toEqual([
        "New lead",
        "New deal",
        "New account",
        "New contact",
      ]);
    },
  );

  it("hides mutation actions in the shared demo", () => {
    expect(getCreateActionsForUser(contextFor("owner", true))).toEqual([]);
  });
});

describe("nested route activity", () => {
  const items = getPrimaryNavigationForUser(contextFor("owner"));
  const settings = getSecondaryNavigationForUser(contextFor("owner"))[0]!;

  it.each([
    ["Leads", "/dashboard/leads/new"],
    ["Leads", "/dashboard/leads/lead-id/edit"],
    ["Deals", "/dashboard/deals/deal-id"],
    ["Customers", "/dashboard/customers/accounts"],
    ["Customers", "/dashboard/customers/accounts/account-id"],
    ["Customers", "/dashboard/customers/contacts/contact-id"],
    ["Customers", "/dashboard/accounts/legacy-id"],
    ["Customers", "/dashboard/contacts/legacy-id"],
  ])("keeps %s active for %s", (label, pathname) => {
    const item = items.find((candidate) => candidate.label === label)!;
    expect(isNavigationItemActive(pathname, item)).toBe(true);
  });

  it.each([
    "/dashboard/settings/audit-log",
    "/dashboard/settings/imports/history",
    "/dashboard/settings/activity",
    "/dashboard/import",
  ])("keeps Settings active for %s", (pathname) => {
    expect(isNavigationItemActive(pathname, settings)).toBe(true);
  });
});
