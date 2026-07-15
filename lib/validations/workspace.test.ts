import { describe, expect, it } from "vitest";
import {
  inviteWorkspaceMemberSchema,
  updateWorkspaceMemberRoleSchema,
} from "@/lib/validations/workspace";

describe("workspace invitation validation", () => {
  it("only permits admin and member invitation roles", () => {
    expect(
      inviteWorkspaceMemberSchema.safeParse({
        email: "Alex@Example.com",
        role: "admin",
      }).data,
    ).toMatchObject({ email: "alex@example.com", role: "admin" });
    expect(
      inviteWorkspaceMemberSchema.safeParse({
        email: "alex@example.com",
        role: "owner",
      }).success,
    ).toBe(false);
  });

  it("does not accept owner role updates from a modified client request", () => {
    expect(
      updateWorkspaceMemberRoleSchema.safeParse({
        memberId: "3c57b5ae-6f12-4b18-bec8-a9ddf23a4f6e",
        role: "owner",
      }).success,
    ).toBe(false);
  });
});
