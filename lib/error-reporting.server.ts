import "server-only";

import { logger, type LogContext } from "@/lib/logger.server";

/** Errors caused by invalid input or expected business rules are safe to return, not alert on. */
export class DomainError extends Error {}

type ErrorReporter = (error: Error, context: LogContext) => void | Promise<void>;
let reporter: ErrorReporter | undefined;

export function setErrorReporterForTests(nextReporter?: ErrorReporter) {
  reporter = nextReporter;
}

export async function reportUnexpectedError(error: unknown, context: LogContext = {}) {
  if (error instanceof DomainError) return false;

  const normalized = error instanceof Error ? error : new Error("Unknown application error");
  const safeContext = { ...context, errorName: normalized.name };
  logger.error("unexpected_error", "Unexpected application failure.", safeContext);

  try {
    await reporter?.(normalized, safeContext);
  } catch {
    // An optional provider outage must not hide the original application result.
  }
  return true;
}
