import { describe, expect, it } from "vitest";
import {
  getDuplicateAction,
  getMappedNonBlankFields,
} from "@/lib/imports/processing";

describe("CSV import processing policy", () => {
  it("defaults duplicate rows to skip", () => {
    expect(
      getDuplicateAction({
        isDuplicate: true,
        strategy: "skip",
        existingRecordId: "record-id",
      }),
    ).toBe("skip");
  });

  it("updates only exact existing matches and skips within-file update targets", () => {
    expect(
      getDuplicateAction({
        isDuplicate: true,
        strategy: "update",
        existingRecordId: "record-id",
      }),
    ).toBe("update");
    expect(
      getDuplicateAction({
        isDuplicate: true,
        strategy: "update",
        existingRecordId: null,
      }),
    ).toBe("skip");
  });

  it("imports duplicate rows as new only when explicitly selected", () => {
    expect(
      getDuplicateAction({
        isDuplicate: true,
        strategy: "create_new",
        existingRecordId: null,
      }),
    ).toBe("insert");
  });

  it("does not treat blank mapped cells as update fields", () => {
    expect(
      getMappedNonBlankFields(
        { Name: "Ava", Email: "   ", Phone: "" },
        { Name: "fullName", Email: "email", Phone: "phone" },
      ),
    ).toEqual(new Set(["fullName"]));
  });
});
