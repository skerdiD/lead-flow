import "server-only";

import { logger, redact, type LogContext } from "@/lib/logger.server";

/** Errors caused by invalid input or expected business rules are safe to return, not alert on. */
export class DomainError extends Error {}

type ErrorReporter = (error: Error, context: LogContext) => void | Promise<void>;
let reporter: ErrorReporter | undefined;

export type NormalizedError = {
  errorName: string;
  errorCode: string;
  errorStack?: string;
};

function errorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return "UNKNOWN_ERROR";
  }

  const code = error.code;
  return typeof code === "string" || typeof code === "number"
    ? String(code)
    : "UNKNOWN_ERROR";
}

/**
 * Converts arbitrary thrown values into safe, searchable logging metadata.
 * The error message is intentionally omitted because it can include customer
 * input; the stack retains its diagnostic frames but not the message line.
 */
export function normalizeError(error: unknown): NormalizedError {
  if (!(error instanceof Error)) {
    return {
      errorName: "UnknownError",
      errorCode: errorCode(error),
    };
  }

  const stackLines = error.stack?.split("\n") ?? [];
  const frames = stackLines.slice(1).map((line) => redact(line) as string);

  return {
    errorName: error.name || "Error",
    errorCode: errorCode(error),
    ...(frames.length > 0
      ? { errorStack: [`${error.name || "Error"}: ${"[REDACTED]"}`, ...frames].join("\n") }
      : {}),
  };
}

export function setErrorReporterForTests(nextReporter?: ErrorReporter) {
  reporter = nextReporter;
}

export async function reportUnexpectedError(
  error: unknown,
  context: LogContext & { event?: string } = {},
) {
  if (error instanceof DomainError) return false;

  const normalized = error instanceof Error ? error : new Error("Unknown application error");
  const { event = "unexpected_error", ...logContext } = context;
  const safeContext = { ...logContext, ...normalizeError(error) };
  logger.error(event, "Unexpected application failure.", safeContext);

  try {
    await reporter?.(normalized, safeContext);
  } catch {
    // An optional provider outage must not hide the original application result.
  }
  return true;
}
