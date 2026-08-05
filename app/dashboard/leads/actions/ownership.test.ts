import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireUserIdMock,
  getCurrentWorkspaceMock,
  protectionMock,
  selectMock,
  updateMock,
} = vi.hoisted(() => ({
  requireUserIdMock: vi.fn(),
  getCurrentWorkspaceMock: vi.fn(),
  protectionMock: vi.fn(),
  selectMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireUserId: requireUserIdMock }));
vi.mock("@/lib/workspaces", () => ({ getCurrentWorkspace: getCurrentWorkspaceMock }));
vi.mock("@/app/dashboard/leads/actions/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/dashboard/leads/actions/shared")>();
  return { ...actual, ensureLeadMutationAllowed: protectionMock };
});
vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    update: updateMock,
    transaction: vi.fn(),
  },
}));

import { updateLeadOwnerAction } from "@/app/dashboard/leads/actions/ownership";

const leadId = "11111111-1111-4111-8111-111111111111";

describe("updateLeadOwnerAction authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserIdMock.mockResolvedValue("member_user");
    protectionMock.mockResolvedValue({ ok: true });
    getCurrentWorkspaceMock.mockResolvedValue({
      id: "workspace_active",
      name: "Active workspace",
      role: "member",
    });
  });

  it("rejects a direct owner-change mutation from a member", async () => {
    const result = await updateLeadOwnerAction(leadId, "another_user");

    expect(result).toEqual({
      success: false,
      message: "You do not have permission to change record assignments.",
    });
    expect(selectMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects malformed ids before resolving workspace state", async () => {
    await expect(updateLeadOwnerAction("bad-id", "another_user")).resolves.toEqual({
      success: false,
      message: "This lead could not be found.",
    });
    expect(getCurrentWorkspaceMock).not.toHaveBeenCalled();
  });
});
