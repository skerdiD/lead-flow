import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClerkClient: vi.fn(),
  getUserList: vi.fn(),
  createSignInToken: vi.fn(),
  dbSelect: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@clerk/backend", () => ({
  createClerkClient: mocks.createClerkClient,
}));

vi.mock("@/db", () => ({
  db: {
    select: mocks.dbSelect,
  },
}));

vi.mock("@/db/schema", () => ({
  workspaces: { id: "workspace-id", name: "workspace-name" },
  workspaceMembers: { workspaceId: "membership-workspace-id", userId: "membership-user-id", role: "membership-role" },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions: unknown[]) => conditions),
  eq: vi.fn((column: unknown, value: unknown) => ({ column, value })),
}));

import { createDemoSignInUrl, DemoLoginError } from "@/lib/demo-auth.server";

const users = {
  "leadflow-demo-owner": {
    id: "clerk-owner",
    externalId: "leadflow-demo-owner",
    emailAddresses: [{ emailAddress: "leadflow-demo@example.com" }],
  },
  "leadflow-demo-admin": {
    id: "clerk-admin",
    externalId: "leadflow-demo-admin",
    emailAddresses: [{ emailAddress: "leadflow-demo-admin@example.com" }],
  },
  "leadflow-demo-member": {
    id: "clerk-member",
    externalId: "leadflow-demo-member",
    emailAddresses: [{ emailAddress: "leadflow-demo-member@example.com" }],
  },
} as const;

function queryResult(rows: unknown[]) {
  const query = {
    where: () => ({
      limit: async () => rows,
    }),
  };

  return {
    from: () => ({
      ...query,
      innerJoin: () => query,
    }),
  };
}

function setValidDemoEnvironment() {
  process.env.DEMO_LOGIN_ENABLED = "true";
  process.env.DEMO_OWNER_EMAIL = "leadflow-demo@example.com";
  process.env.DEMO_ADMIN_EMAIL = "leadflow-demo-admin@example.com";
  process.env.DEMO_MEMBER_EMAIL = "leadflow-demo-member@example.com";
  process.env.CLERK_SECRET_KEY = "sk_test_demo";
}

beforeEach(() => {
  vi.clearAllMocks();
  setValidDemoEnvironment();
  mocks.createClerkClient.mockReturnValue({
    users: { getUserList: mocks.getUserList },
    signInTokens: { createSignInToken: mocks.createSignInToken },
  });
  mocks.getUserList.mockImplementation(({ externalId }: { externalId: string[] }) =>
    Promise.resolve({ data: [users[externalId[0] as keyof typeof users]] }),
  );
  mocks.createSignInToken.mockResolvedValue({
    url: "https://clerk.example/sign-in-token",
  });
});

describe("demo role sign-in tokens", () => {
  it.each([
    ["owner", "clerk-owner"],
    ["admin", "clerk-admin"],
    ["member", "clerk-member"],
  ] as const)("creates a token only for the configured %s account", async (role, userId) => {
    mocks.dbSelect
      .mockReturnValueOnce(queryResult([{ id: "demo-workspace" }]))
      .mockReturnValueOnce(queryResult([{ role }]));

    await expect(createDemoSignInUrl(role)).resolves.toBe(
      "https://clerk.example/sign-in-token",
    );
    expect(mocks.createSignInToken).toHaveBeenCalledWith({
      userId,
      expiresInSeconds: 300,
    });
  });

  it("fails closed when the stored membership role does not match the requested role", async () => {
    mocks.dbSelect
      .mockReturnValueOnce(queryResult([{ id: "demo-workspace" }]))
      .mockReturnValueOnce(queryResult([{ role: "member" }]));

    await expect(createDemoSignInUrl("admin")).rejects.toBeInstanceOf(
      DemoLoginError,
    );
    expect(mocks.createSignInToken).not.toHaveBeenCalled();
  });

  it("refuses disabled demo login before resolving any account", async () => {
    process.env.DEMO_LOGIN_ENABLED = "false";

    await expect(createDemoSignInUrl("owner")).rejects.toMatchObject({
      status: 503,
    });
    expect(mocks.getUserList).not.toHaveBeenCalled();
  });

  it("returns a controlled failure when demo configuration is incomplete", async () => {
    delete process.env.DEMO_ADMIN_EMAIL;

    await expect(createDemoSignInUrl("admin")).rejects.toMatchObject({
      status: 503,
    });
    expect(mocks.createSignInToken).not.toHaveBeenCalled();
  });
});
