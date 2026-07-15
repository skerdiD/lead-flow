import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { ensureDemoWorkspaceSeeded } = await import("../lib/demo.server");
  const result = await ensureDemoWorkspaceSeeded({ forceReset: true });

  console.log(`Demo workspace ready: ${result.workspaceName} (${result.workspaceId})`);
  console.log(`Demo user id: ${result.userId}`);
  console.log(`Seed refreshed: ${result.seeded ? "yes" : "no"}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`Demo seed failed: ${message}`);
  process.exitCode = 1;
});
