const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export function normalizeUuidList(values: Iterable<string>, max: number) {
  return Array.from(
    new Set(
      Array.from(values)
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && isUuid(value)),
    ),
  ).slice(0, max);
}
