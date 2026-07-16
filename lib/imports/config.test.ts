import { describe, expect, it } from "vitest";
import {
  suggestMappings,
  validateMapping,
} from "@/lib/imports/config";

describe("CSV import field mapping", () => {
  it("suggests deterministic aliases and leaves unknown headers unmapped", () => {
    expect(
      suggestMappings("lead", [
        "First Name",
        "E-mail Address",
        "Organization",
        "Mystery Field",
      ]),
    ).toEqual({
      "First Name": "firstName",
      "E-mail Address": "email",
      Organization: "company",
      "Mystery Field": null,
    });
  });

  it("requires a person name or account name mapping", () => {
    expect(validateMapping("lead", ["Email"], { Email: "email" })).toContain(
      "Map a column to Full name or First name.",
    );
    expect(validateMapping("account", ["Industry"], { Industry: "industry" })).toContain(
      "Map a column to Account name.",
    );
  });

  it("rejects duplicate destination fields", () => {
    expect(
      validateMapping(
        "contact",
        ["Email", "Work Email", "Name"],
        { Email: "email", "Work Email": "email", Name: "fullName" },
      ),
    ).toContain("email cannot be mapped more than once.");
  });
});
