import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  canManageWorkspaceMember,
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
    expect(hasWorkspacePermission("admin", "crm:delete")).toBe(true);
    expect(hasWorkspacePermission("admin", "analytics:view")).toBe(true);
    expect(hasWorkspacePermission("admin", "exports:create")).toBe(true);
    expect(hasWorkspacePermission("admin", "members:invite")).toBe(true);
    expect(hasWorkspacePermission("admin", "members:change_role")).toBe(true);
    expect(hasWorkspacePermission("admin", "workspace:transfer_ownership")).toBe(false);
    expect(hasWorkspacePermission("admin", "workspace:delete")).toBe(false);
    expect(hasWorkspacePermission("admin", "billing:manage")).toBe(false);
  });

  it("limits members to normal CRM work and analytics", () => {
    expect(hasWorkspacePermission("member", "crm:view")).toBe(true);
    expect(hasWorkspacePermission("member", "crm:create")).toBe(true);
    expect(hasWorkspacePermission("member", "crm:update")).toBe(true);
    expect(hasWorkspacePermission("member", "analytics:view")).toBe(true);
    expect(hasWorkspacePermission("member", "crm:delete")).toBe(false);
    expect(hasWorkspacePermission("member", "members:invite")).toBe(false);
    expect(hasWorkspacePermission("member", "workspace:update")).toBe(false);
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
