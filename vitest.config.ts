import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    // Unit and integration tests must not inherit the job-level Playwright
    // bypass. Tests that exercise E2E mode opt in explicitly with vi.stubEnv.
    env: {
      E2E_TEST_MODE: "0",
      NEXT_PUBLIC_E2E_TEST_MODE: "0",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "lib/test-server-only.ts"),
    },
  },
});
