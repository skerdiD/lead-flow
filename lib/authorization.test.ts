import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  canAccessRecord,
  canManageWorkspaceMember,
  getWorkspaceAuthorizationContext,
  hasWorkspacePermission,
  workspacePermissions,
} from "@/lib/authorization";

describe("workspace RBAC permission matrix", () => {
  it("gives the owner every defined workspace permission", () => {
    for (const permission of workspacePermissions) {
      expect(hasWorkspacePermission("owner", permission)).toBe(true);
    }
  });

  it("allows admins to operate CRM and manage eligible members without ownership control", () => {
    expect(hasWorkspacePermission("admin", "crm:view_all")).toBe(true);
    expect(hasWorkspacePermission("admin", "crm:update_all")).toBe(true);
    expect(hasWorkspacePermission("admin", "crm:delete")).toBe(true);
    expect(hasWorkspacePermission("admin", "crm:import")).toBe(true);
    expect(hasWorkspacePermission("admin", "analytics:view")).toBe(true);
    expect(hasWorkspacePermission("admin", "exports:create")).toBe(true);
    expect(hasWorkspacePermission("admin", "members:manage")).toBe(true);
    expect(hasWorkspacePermission("admin", "ownership:transfer")).toBe(false);
    expect(hasWorkspacePermission("admin", "workspace:delete")).toBe(false);
    expect(hasWorkspacePermission("admin", "billing:manage")).toBe(false);
  });

  it("limits members to normal CRM work and analytics", () => {
    expect(hasWorkspacePermission("member", "crm:view_assigned")).toBe(true);
    expect(hasWorkspacePermission("member", "crm:create")).toBe(true);
    expect(hasWorkspacePermission("member", "crm:update_assigned")).toBe(true);
    expect(hasWorkspacePermission("member", "analytics:view")).toBe(true);
    expect(hasWorkspacePermission("member", "crm:delete")).toBe(false);
    expect(hasWorkspacePermission("member", "crm:import")).toBe(false);
    expect(hasWorkspacePermission("member", "members:manage")).toBe(false);
    expect(hasWorkspacePermission("member", "workspace:manage")).toBe(false);
    expect(hasWorkspacePermission("member", "workspace:delete")).toBe(false);
  });
});

describe("workspace membership hierarchy", () => {
  it("never allows normal member management to assign or change the owner", () => {
    expect(canManageWorkspaceMember("owner", "owner", "admin")).toBe(false);
    expect(canManageWorkspaceMember("admin", "owner", "member")).toBe(false);
    expect(canManageWorkspaceMember("admin", "member", "owner")).toBe(false);
  });

  it("allows owners and admins to manage admins and members, but not members", () => {
    expect(canManageWorkspaceMember("owner", "member", "admin")).toBe(true);
    expect(canManageWorkspaceMember("owner", "admin", "member")).toBe(true);
    expect(canManageWorkspaceMember("admin", "member", "admin")).toBe(true);
    expect(canManageWorkspaceMember("admin", "admin", "member")).toBe(true);
    expect(canManageWorkspaceMember("member", "member", "admin")).toBe(false);
    expect(canManageWorkspaceMember("member", "member", undefined, "remove")).toBe(false);
  });
});

describe("record-level CRM authorization", () => {
  const owner = getWorkspaceAuthorizationContext(
    { id: "workspace-a", role: "owner" },
    "owner-user",
  );
  const admin = getWorkspaceAuthorizationContext(
    { id: "workspace-a", role: "admin" },
    "admin-user",
  );
  const member = getWorkspaceAuthorizationContext(
    { id: "workspace-a", role: "member" },
    "member-user",
  );

  it("allows owners and admins to view and update every record in their workspace", () => {
    const teammateRecord = { workspaceId: "workspace-a", assignedUserId: "other-user" };

    expect(canAccessRecord(owner, teammateRecord, "view")).toBe(true);
    expect(canAccessRecord(owner, teammateRecord, "update")).toBe(true);
    expect(canAccessRecord(admin, teammateRecord, "view")).toBe(true);
    expect(canAccessRecord(admin, teammateRecord, "update")).toBe(true);
  });

  it("limits members to records explicitly assigned to them", () => {
    expect(canAccessRecord(member, { workspaceId: "workspace-a", assignedUserId: "member-user" }, "view")).toBe(true);
    expect(canAccessRecord(member, { workspaceId: "workspace-a", assignedUserId: "member-user" }, "update")).toBe(true);
    expect(canAccessRecord(member, { workspaceId: "workspace-a", assignedUserId: "other-user" }, "view")).toBe(false);
    expect(canAccessRecord(member, { workspaceId: "workspace-a", assignedUserId: "other-user" }, "update")).toBe(false);
    expect(canAccessRecord(member, { workspaceId: "workspace-a", assignedUserId: null }, "view")).toBe(false);
    expect(canAccessRecord(member, { workspaceId: "workspace-a", assignedUserId: "member-user" }, "delete")).toBe(false);
  });

  it("never allows a record from another workspace", () => {
    expect(canAccessRecord(admin, { workspaceId: "workspace-b", assignedUserId: "admin-user" }, "view")).toBe(false);
    expect(canAccessRecord(owner, { workspaceId: "workspace-b", assignedUserId: "owner-user" }, "delete")).toBe(false);
  });
});
