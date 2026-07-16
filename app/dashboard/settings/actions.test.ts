import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentWorkspace: vi.fn(),
  requireUserId: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(),
  currentUser: vi.fn(),
}));
vi.mock("drizzle-orm", () => ({ and: vi.fn(), eq: vi.fn(), lt: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/schema", () => ({
  activityEvents: {},
  workspaceInvitations: {},
  workspaceMembers: {},
  workspaces: {},
}));
vi.mock("@/lib/auth", () => ({ requireUserId: mocks.requireUserId }));
vi.mock("@/lib/workspaces", () => ({ getCurrentWorkspace: mocks.getCurrentWorkspace }));
vi.mock("@/lib/workspace-invitations-email", () => ({
  sendWorkspaceInvitationEmail: vi.fn(),
}));
vi.mock("@/lib/workspace-ownership", () => ({
  WorkspaceOwnershipError: class WorkspaceOwnershipError extends Error {},
  transferWorkspaceOwnershipInTransaction: vi.fn(),
}));

import {
  acceptWorkspaceInvitationAction,
  deleteWorkspaceAction,
  transferWorkspaceOwnershipAction,
} from "@/app/dashboard/settings/actions";
import { DEMO_MUTATION_MESSAGE, DEMO_WORKSPACE_NAME } from "@/lib/demo";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUserId.mockResolvedValue("clerk-owner");
  mocks.getCurrentWorkspace.mockResolvedValue({
    id: "demo-workspace",
    name: DEMO_WORKSPACE_NAME,
    ownerUserId: "clerk-owner",
    role: "owner",
  });
});

describe("demo workspace management restrictions", () => {
  it("blocks workspace deletion server-side for the demo owner", async () => {
    await expect(
      deleteWorkspaceAction({ confirmationName: DEMO_WORKSPACE_NAME }),
    ).resolves.toEqual({ success: false, message: DEMO_MUTATION_MESSAGE });
  });

  it("blocks ownership transfer server-side for the demo owner", async () => {
    await expect(
      transferWorkspaceOwnershipAction({
        memberId: "00000000-0000-4000-8000-000000000001",
      }),
    ).resolves.toEqual({ success: false, message: DEMO_MUTATION_MESSAGE });
  });

  it("blocks a demo user from accepting an invitation into another workspace", async () => {
    await expect(
      acceptWorkspaceInvitationAction("a".repeat(32)),
    ).resolves.toEqual({ success: false, message: DEMO_MUTATION_MESSAGE });
  });
});
