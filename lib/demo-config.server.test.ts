import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  DemoConfigurationError,
  getDemoUserConfig,
  isDemoLoginEnabled,
} from "@/lib/demo-config.server";

const originalEnvironment = { ...process.env };

function setValidDemoEnvironment() {
  process.env.DEMO_LOGIN_ENABLED = "true";
  process.env.DEMO_OWNER_EMAIL = "leadflow-demo@example.com";
  process.env.DEMO_ADMIN_EMAIL = "leadflow-demo-admin@example.com";
  process.env.DEMO_MEMBER_EMAIL = "leadflow-demo-member@example.com";
}

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnvironment)) delete process.env[key];
  }
  Object.assign(process.env, originalEnvironment);
  vi.unstubAllEnvs();
});

describe("demo server configuration", () => {
  it("keeps each configured email mapped to a fixed role and internal identity", () => {
    setValidDemoEnvironment();

    expect(getDemoUserConfig("owner")).toMatchObject({
      role: "owner",
      email: "leadflow-demo@example.com",
      externalId: "leadflow-demo-owner",
    });
    expect(getDemoUserConfig("admin")).toMatchObject({
      role: "admin",
      email: "leadflow-demo-admin@example.com",
      externalId: "leadflow-demo-admin",
    });
    expect(getDemoUserConfig("member")).toMatchObject({
      role: "member",
      email: "leadflow-demo-member@example.com",
      externalId: "leadflow-demo-member",
    });
  });

  it("fails closed when a demo identity is not configured", () => {
    setValidDemoEnvironment();
    delete process.env.DEMO_MEMBER_EMAIL;

    expect(() => getDemoUserConfig("member")).toThrow(DemoConfigurationError);
  });

  it("requires an explicit feature flag", () => {
    setValidDemoEnvironment();
    expect(isDemoLoginEnabled()).toBe(true);

    process.env.DEMO_LOGIN_ENABLED = "false";
    expect(isDemoLoginEnabled()).toBe(false);
  });
});
