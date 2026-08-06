import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorization: vi.fn(),
  select: vi.fn(),
  clerkClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/authorization", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/authorization")>();
  return {
    ...actual,
    getCurrentWorkspaceAuthorizationContext: mocks.authorization,
  };
});
vi.mock("@/db", () => ({ db: { select: mocks.select } }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: mocks.clerkClient }));

import { getWorkspaceTeam } from "@/lib/workspace-team";

describe("workspace-team helper authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not trust a caller-supplied workspace and blocks member directory reads", async () => {
    mocks.authorization.mockResolvedValue({
      workspaceId: "workspace-active",
      userId: "member-user",
      role: "member",
    });

    await expect(
      getWorkspaceTeam({ search: "workspace-attacker" }),
    ).resolves.toEqual([]);
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.clerkClient).not.toHaveBeenCalled();
  });
});
