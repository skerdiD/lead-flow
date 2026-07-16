import type { DuplicateStrategy } from "@/lib/imports/config";

export function getDuplicateAction(input: {
  isDuplicate: boolean;
  strategy: DuplicateStrategy;
  existingRecordId: string | null;
}) {
  if (!input.isDuplicate) return "insert" as const;
  if (input.strategy === "skip") return "skip" as const;
  if (input.strategy === "create_new") return "insert" as const;
  return input.existingRecordId ? ("update" as const) : ("skip" as const);
}

export function getMappedNonBlankFields(
  rawData: Record<string, string>,
  mapping: Record<string, string | null>,
) {
  return new Set(
    Object.entries(mapping)
      .filter(([header, field]) => field && rawData[header]?.trim())
      .map(([, field]) => field as string),
  );
}
