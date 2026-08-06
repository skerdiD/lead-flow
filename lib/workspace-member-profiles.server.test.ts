import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserListMock, selectMock, authorizationMock, memberships, workspaceMembersTable } = vi.hoisted(() => ({
  getUserListMock: vi.fn(),
  selectMock: vi.fn(),
  authorizationMock: vi.fn(),
  memberships: [] as Array<{ userId: string }>,
  workspaceMembersTable: {
    userId: "user_id",
    workspaceId: "workspace_id",
    createdAt: "created_at",
  },
}));

function selectBuilder() {
  const builder = {
    from: vi.fn(() => builder),
    where: vi.fn(() => builder),
    orderBy: vi.fn(() => builder),
    then: (
      onFulfilled: (value: Array<{ userId: string }>) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve([...memberships]).then(onFulfilled, onRejected),
  };
  return builder;
}

vi.mock("@/db/schema", () => ({
  workspaceMembers: workspaceMembersTable,
}));

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(async () => ({
    users: { getUserList: getUserListMock },
  })),
}));
vi.mock("@/lib/authorization", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/authorization")>();
  return {
    ...actual,
    getCurrentWorkspaceAuthorizationContext: authorizationMock,
  };
});

import {
  getWorkspaceMemberOptions,
  resolveWorkspaceMemberProfiles,
} from "@/lib/workspace-member-profiles.server";

describe("workspace member profile resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    memberships.length = 0;
    memberships.push(
      { userId: "user_one" },
      { userId: "user_two" },
      { userId: "user_missing_profile" },
    );
    selectMock.mockImplementation(() => selectBuilder());
    authorizationMock.mockResolvedValue({
      workspaceId: "workspace_123",
      userId: "user_one",
      role: "admin",
    });
    getUserListMock.mockResolvedValue({
      data: [
        {
          id: "user_one",
          firstName: "Grace",
          lastName: "Kim",
          username: null,
          imageUrl: "https://example.com/grace.png",
        },
        {
          id: "user_two",
          firstName: null,
          lastName: null,
          username: "skerdi",
          imageUrl: "",
        },
      ],
    });
  });

  it("resolves all requested owners with one membership query and one batched Clerk request", async () => {
    const profiles = await getWorkspaceMemberOptions([
      "user_one",
      "user_two",
      "user_missing_profile",
    ]);

    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(getUserListMock).toHaveBeenCalledTimes(1);
    expect(getUserListMock).toHaveBeenCalledWith({
      userId: ["user_one", "user_two", "user_missing_profile"],
      limit: 3,
    });
    expect(profiles.map((profile) => profile.name)).toEqual([
      "Grace Kim",
      "skerdi",
      "Unknown member",
    ]);
  });

  it("never substitutes a technical user ID when a profile is unavailable", async () => {
    getUserListMock.mockRejectedValue(new Error("profile provider unavailable"));

    const profiles = await resolveWorkspaceMemberProfiles([
      "user_missing_profile",
    ]);

    expect(profiles.get("user_missing_profile")).toEqual({
      name: "Unknown member",
      imageUrl: null,
    });
    expect(profiles.get("user_missing_profile")?.name).not.toContain("user_");
  });

});
