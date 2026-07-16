import "server-only";

import type { DemoRole } from "@/lib/demo";

export type DemoUserConfig = {
  role: DemoRole;
  email: string;
  externalId: string;
};

const demoExternalIds: Record<DemoRole, string> = {
  owner: "leadflow-demo-owner",
  admin: "leadflow-demo-admin",
  member: "leadflow-demo-member",
};

const demoEmailEnvironmentKeys: Record<DemoRole, string> = {
  owner: "DEMO_OWNER_EMAIL",
  admin: "DEMO_ADMIN_EMAIL",
  member: "DEMO_MEMBER_EMAIL",
};

export class DemoConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DemoConfigurationError";
  }
}

function readDemoEmail(role: DemoRole) {
  const environmentKey = demoEmailEnvironmentKeys[role];
  const email = process.env[environmentKey]?.trim().toLowerCase();

  if (!email) {
    throw new DemoConfigurationError(
      `The demo ${role} identity is not configured.`,
    );
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new DemoConfigurationError(
      `The demo ${role} identity is invalid.`,
    );
  }

  return email;
}

export function isDemoLoginEnabled() {
  return process.env.DEMO_LOGIN_ENABLED === "true";
}

export function getDemoUserConfig(role: DemoRole): DemoUserConfig {
  return {
    role,
    email: readDemoEmail(role),
    externalId: demoExternalIds[role],
  };
}

export function getDemoUserConfigs(): Record<DemoRole, DemoUserConfig> {
  return {
    owner: getDemoUserConfig("owner"),
    admin: getDemoUserConfig("admin"),
    member: getDemoUserConfig("member"),
  };
}
