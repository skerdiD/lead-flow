import { log, type LogLevel } from "@/lib/logger.server";

export function logImportEvent(
  level: Exclude<LogLevel, "debug">,
  event: string,
  context: Record<string, unknown>,
) {
  log(level, event, "CSV import event.", { service: "leadflow-csv-import", ...context });
}
