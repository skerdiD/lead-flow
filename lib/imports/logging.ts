type ImportLogLevel = "info" | "warn" | "error";

export function logImportEvent(
  level: ImportLogLevel,
  event: string,
  context: Record<string, unknown>,
) {
  const payload = JSON.stringify({
    level,
    event,
    service: "leadflow-csv-import",
    timestamp: new Date().toISOString(),
    ...context,
  });

  if (level === "error") {
    console.error(payload);
  } else if (level === "warn") {
    console.warn(payload);
  } else {
    console.info(payload);
  }
}
