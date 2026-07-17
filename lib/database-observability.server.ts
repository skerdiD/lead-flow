import "server-only";

import { logger, logMetric } from "@/lib/logger.server";

const DEFAULT_SLOW_QUERY_THRESHOLD_MS = 500;

export function getSlowQueryThresholdMs() {
  const configured = Number(process.env.SLOW_QUERY_THRESHOLD_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_SLOW_QUERY_THRESHOLD_MS;
}

export async function observeDatabaseOperation<T>(
  operation: string,
  execute: () => Promise<T>,
) {
  const startedAt = performance.now();
  try {
    return await execute();
  } finally {
    const durationMs = Math.round(performance.now() - startedAt);
    logMetric("database.operation.duration_ms", durationMs, { operation });
    if (durationMs >= getSlowQueryThresholdMs()) {
      logger.warn("slow_query", "Database operation exceeded the slow-query threshold.", {
        operation,
        durationMs,
        thresholdMs: getSlowQueryThresholdMs(),
      });
      logMetric("database.slow_query.count", 1, { operation });
    }
  }
}
