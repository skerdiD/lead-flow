import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NotificationEmptyState } from "@/components/notifications/notification-empty-state";

describe("NotificationEmptyState", () => {
  it("renders the all-caught-up empty state", () => {
    const markup = renderToStaticMarkup(createElement(NotificationEmptyState));

    expect(markup).toContain("all caught up");
    expect(markup).toContain("New notifications will appear here.");
  });
});
