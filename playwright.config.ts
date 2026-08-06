import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";
// Protected E2E routes bypass Clerk. The auth pages still mount Clerk to verify
// CSP integration, so keep their inert public configuration well-formed.
const e2eClerkPublishableKey =
  "pk_test_bGVhZC1mbG93LWUyZS0xLmNsZXJrLmFjY291bnRzLmRldiQ=";
const webServerCommand =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ||
  (process.platform === "win32"
    ? "npm.cmd run dev -- --hostname 127.0.0.1 --port 3100"
    : "npm run dev -- --hostname 127.0.0.1 --port 3100");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: webServerCommand,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      E2E_TEST_MODE: "1",
      NEXT_PUBLIC_E2E_TEST_MODE: "1",
      E2E_USER_ID: process.env.E2E_USER_ID || "e2e-user",
      E2E_TEST_SECRET: process.env.E2E_TEST_SECRET || "leadflow-local-e2e-secret",
      DEMO_LOGIN_ENABLED: "true",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: e2eClerkPublishableKey,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
