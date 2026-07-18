import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const roleCookieName = "leadflow_e2e_workspace_role";

async function resetWorkspace(request: APIRequestContext) {
  const response = await request.post("/api/testing/e2e/reset", {
    headers: {
      "x-e2e-test-secret":
        process.env.E2E_TEST_SECRET || "leadflow-local-e2e-secret",
    },
  });
  expect(response.ok()).toBeTruthy();
}

async function useRole(page: Page, role: "owner" | "admin" | "member") {
  await page.goto("/dashboard");
  await page.context().addCookies([
    {
      name: roleCookieName,
      value: role,
      url: new URL(page.url()).origin,
    },
  ]);
  await page.reload();
}

function desktopSidebar(page: Page) {
  return page.getByTestId("desktop-sidebar");
}

async function expectCompactPrimaryNavigation(page: Page) {
  const sidebar = desktopSidebar(page);

  for (const label of ["Dashboard", "Leads", "Deals", "Customers", "Tasks"]) {
    await expect(sidebar.getByRole("link", { name: label, exact: true })).toBeVisible();
  }

  for (const removedLabel of ["Add Lead", "Import", "Activity", "Audit Log"]) {
    await expect(sidebar.getByRole("link", { name: removedLabel, exact: true })).toHaveCount(0);
  }
}

test.describe("role-aware dashboard navigation", () => {
  test.beforeEach(async ({ request }) => {
    await resetWorkspace(request);
  });

  test("Owner sees the compact shell, permitted settings, and every implemented create action", async ({ page }) => {
    await useRole(page, "owner");
    await expectCompactPrimaryNavigation(page);

    await page.getByRole("button", { name: "Create a CRM record" }).click();
    for (const action of ["New lead", "New deal", "New account", "New contact"]) {
      await expect(page.getByRole("menuitem", { name: new RegExp(action) })).toBeVisible();
    }

    await desktopSidebar(page).getByRole("link", { name: "Settings", exact: true }).click();
    await expect(page.getByRole("link", { name: "Team & roles" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Data & imports" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Audit log" })).toBeVisible();
  });

  test("Admin sees operational settings without Owner-only controls", async ({ page }) => {
    await useRole(page, "admin");
    await expectCompactPrimaryNavigation(page);

    await page.goto("/dashboard/settings");
    await expect(page.getByRole("link", { name: "Team & roles" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Data & imports" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Audit log" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Transfer ownership" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Delete workspace/ })).toHaveCount(0);
  });

  test("Member sees assignment-safe areas and cannot open import or audit administration", async ({ page }) => {
    await useRole(page, "member");
    await expectCompactPrimaryNavigation(page);

    await page.goto("/dashboard/settings");
    await expect(page.getByRole("link", { name: "Team & roles" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Data & imports" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Audit log" })).toHaveCount(0);
    await expect(page.getByText("Assigned CRM records")).toBeVisible();

    const importResponse = await page.goto("/dashboard/settings/imports");
    expect(importResponse?.status()).toBe(404);
    const auditResponse = await page.goto("/dashboard/settings/audit-log");
    expect(auditResponse?.status()).toBe(404);
  });
});

test.describe("desktop, collapsed, Customers, and mobile navigation", () => {
  test.beforeEach(async ({ request }) => {
    await resetWorkspace(request);
  });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
  ]) {
    test(`keeps the sidebar stable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await useRole(page, "owner");

      const scrollRegion = page.getByTestId("sidebar-navigation-scroll-region");
      const dimensions = await scrollRegion.evaluate((element) => ({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      }));
      expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.clientHeight);

      const bottom = await page.getByTestId("sidebar-bottom-navigation").boundingBox();
      expect(bottom).not.toBeNull();
      expect(bottom!.y + bottom!.height).toBeLessThanOrEqual(viewport.height);
      expect(bottom!.y).toBeGreaterThan(viewport.height - 180);
    });
  }

  test("keeps Customers active across canonical and legacy account/contact routes", async ({ page }) => {
    await useRole(page, "owner");
    const customers = desktopSidebar(page).getByRole("link", { name: "Customers", exact: true });
    await customers.click();

    await expect(page).toHaveURL(/\/dashboard\/customers\/accounts$/);
    await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Accounts" })).toHaveAttribute("aria-current", "page");
    await expect(customers).toHaveAttribute("aria-current", "page");

    await page.getByRole("link", { name: "Contacts", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/customers\/contacts$/);
    await expect(customers).toHaveAttribute("aria-current", "page");

    await page.goto("/dashboard/accounts");
    await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
    await expect(customers).toHaveAttribute("aria-current", "page");
  });

  test("persists collapse state and exposes keyboard-accessible tooltips", async ({ page }) => {
    await useRole(page, "owner");
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(desktopSidebar(page)).toHaveCSS("width", "72px");

    const customers = desktopSidebar(page).getByRole("link", { name: "Customers", exact: true });
    await customers.focus();
    await expect(page.getByRole("tooltip", { name: "Customers" })).toBeVisible();

    await page.reload();
    await expect(desktopSidebar(page)).toHaveCSS("width", "72px");
  });

  test("mobile drawer traps focus, closes with Escape, and navigates from the shared source", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await useRole(page, "owner");

    await page.getByRole("button", { name: "Open navigation" }).click();
    const drawer = page.getByRole("dialog", { name: "LeadFlow navigation" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Customers", exact: true })).toBeVisible();

    await page.keyboard.press("Tab");
    const focusInside = await page.evaluate(() =>
      Boolean(document.activeElement?.closest('[data-slot="sheet-content"]')),
    );
    expect(focusInside).toBe(true);

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();

    await page.getByRole("button", { name: "Open navigation" }).click();
    await drawer.getByRole("link", { name: "Customers", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/customers\/accounts$/);
    await expect(drawer).toBeHidden();
    await expect(page.getByRole("button", { name: "Create a CRM record" })).toBeVisible();
  });
});
