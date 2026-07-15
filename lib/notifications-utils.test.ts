import { describe, expect, it } from "vitest";
import {
  formatUnreadNotificationCount,
  getNotificationBellLabel,
} from "@/lib/notifications-utils";

describe("notification badge helpers", () => {
  it("hides the badge at zero", () => {
    expect(formatUnreadNotificationCount(0)).toBeNull();
    expect(getNotificationBellLabel(0)).toBe("Notifications");
  });

  it("uses exact badge values through 99", () => {
    expect(formatUnreadNotificationCount(1)).toBe("1");
    expect(formatUnreadNotificationCount(99)).toBe("99");
    expect(getNotificationBellLabel(1)).toBe("1 unread notification");
  });

  it("caps large unread counts at 99+", () => {
    expect(formatUnreadNotificationCount(100)).toBe("99+");
    expect(getNotificationBellLabel(100)).toBe("More than 99 unread notifications");
  });
});
