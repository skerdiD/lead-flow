import "server-only";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = {
  requestId?: string;
  workspaceId?: string;
  userId?: string;
  actorUserId?: string;
  operation?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  entityType?: string;
  entityId?: string;
  errorName?: string;
  errorCode?: string;
  errorStack?: string;
  [key: string]: unknown;
};

export type StructuredLog = LogContext & {
  level: LogLevel;
  event: string;
  message: string;
  timestamp: string;
};

const SENSITIVE_KEY = /(password|secret|token|cookie|authorization|api[_-]?key|database[_-]?url|session|invite|email|phone|full[_-]?name|address|notes|customer[_-]?(data|email|phone|name))/i;
const REDACTED = "[REDACTED]";

function redactString(value: string) {
  return value
    .replace(/(bearer\s+)[^\s'"`]+/gi, `$1${REDACTED}`)
    .replace(/([?&](?:password|secret|token|api[_-]?key|session|cookie)=)[^&\s]+/gi, `$1${REDACTED}`)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, REDACTED)
    .replace(/(?<!\w)\+?[0-9][0-9().\s-]{6,}[0-9](?!\w)/g, REDACTED);
}

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[TRUNCATED]";
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : redact(item, depth + 1),
    ]),
  );
}

let testSink: ((entry: StructuredLog) => void) | undefined;

/** Test-only hook; a failing sink is deliberately ignored like a real log transport. */
export function setLogSinkForTests(sink?: (entry: StructuredLog) => void) {
  testSink = sink;
}

export function log(level: LogLevel, event: string, message: string, context: LogContext = {}) {
  const entry = redact({
    level,
    event,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  }) as StructuredLog;

  try {
    if (testSink) {
      testSink(entry);
      return;
    }

    // JSON remains parseable in production; Node's object output is friendlier locally.
    const output = process.env.NODE_ENV === "production" ? JSON.stringify(entry) : entry;
    if (level === "error") console.error(output);
    else if (level === "warn") console.warn(output);
    else if (level === "debug") console.debug(output);
    else console.info(output);
  } catch {
    // Observability must never change customer-facing behavior.
  }
}

export const logger = {
  debug: (event: string, message: string, context?: LogContext) => log("debug", event, message, context),
  info: (event: string, message: string, context?: LogContext) => log("info", event, message, context),
  warn: (event: string, message: string, context?: LogContext) => log("warn", event, message, context),
  error: (event: string, message: string, context?: LogContext) => log("error", event, message, context),
};

export function logMetric(name: string, value: number, context: LogContext = {}) {
  logger.info("metric", "Application metric recorded.", { metric: name, value, ...context });
}

export { REDACTED };
