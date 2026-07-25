import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const roleCookieName = "leadflow_e2e_workspace_role";

async function resetWorkspace(request: APIRequestContext) {
  const response = await request.post("/api/testing/e2e/reset", {
    headers: { "x-e2e-test-secret": process.env.E2E_TEST_SECRET || "leadflow-local-e2e-secret" },
  });
  expect(response.ok()).toBeTruthy();
}

async function createLead(page: Page, name: string, company: string, source = "Website") {
  await page.goto("/dashboard/leads/new");
  await page.getByTestId("lead-full-name-input").fill(name);
  await page.getByTestId("lead-company-input").fill(company);
  await page.getByTestId("lead-source-input").fill(source);
  await page.getByTestId("lead-form-submit-btn").click();
  await expect(page).toHaveURL(/\/dashboard\/leads$/, { timeout: 30_000 });
}

async function createDeal(page: Page) {
  await page.goto("/dashboard/deals/new");
  const form = page.locator("form");
  await form.getByLabel("Deal name *").fill("Northstar expansion");
  await form.getByLabel("Value *").fill("4200");
  await form.getByLabel("Expected close").fill("2030-07-02");
  await form.getByRole("button", { name: "Create deal", exact: true }).click();
  await expect(page.getByText("Deal created.")).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard\/deals\/(?!new(?:[/?#]|$))[^/?#]+$/);
}

async function expectNoDocumentOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client);
}

test.describe("shared live search and filters", () => {
  test.beforeEach(async ({ request }) => resetWorkspace(request));

  test("leads debounces, replaces URL state, keeps focus, and supports keyboard and immediate filters", async ({ page }) => {
    test.setTimeout(120_000);
    await createLead(page, "Alpha Search", "Atlas Labs", "Referral");
    await createLead(page, "Beta Search", "Beacon GmbH", "Website");
    await page.goto("/dashboard/leads?page=2&sortBy=fullName&sortDir=asc");

    const input = page.getByTestId("leads-search-input");
    const historyLength = await page.evaluate(() => history.length);
    await input.fill("Alpha");
    await page.waitForTimeout(250);
    expect(new URL(page.url()).searchParams.has("search")).toBe(false);
    await expect(page.getByText("Beta Search", { exact: true }).first()).toBeVisible();

    await expect.poll(() => new URL(page.url()).searchParams.get("search")).toBe("Alpha");
    const committed = new URL(page.url()).searchParams;
    expect(committed.has("page")).toBe(false);
    expect(committed.get("sortBy")).toBe("fullName");
    expect(committed.get("sortDir")).toBe("asc");
    await expect(input).toBeFocused();
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
    await expect(page.getByText("Beta Search", { exact: true })).toHaveCount(0);

    await input.fill("Beta");
    await input.press("Enter");
    await expect.poll(() => new URL(page.url()).searchParams.get("search")).toBe("Beta");
    await expect(input).toBeFocused();

    await input.press("Escape");
    await expect(input).toHaveValue("");
    await expect.poll(() => new URL(page.url()).searchParams.has("search")).toBe(false);

    await page.getByLabel("Stage").selectOption("Contacted");
    await expect.poll(() => new URL(page.url()).searchParams.get("status")).toBe("Contacted");
    await expect(page.getByRole("button", { name: /^Apply$/ })).toHaveCount(0);
    await page.getByTestId("clear-filters").click();
    await expect.poll(() => new URL(page.url()).searchParams.has("status")).toBe(false);
  });

  test("browser navigation restores committed search and each role stays on scoped server results", async ({ page }) => {
    await createLead(page, "Role Search", "Scoped Co");
    const origin = new URL(page.url()).origin;
    for (const role of ["owner", "admin", "member"] as const) {
      await page.context().addCookies([{ name: roleCookieName, value: role, url: origin }]);
      await page.goto("/dashboard/leads?search=Role");
      await expect(page.getByTestId("leads-search-input")).toHaveValue("Role");
      await expect(page.getByText("Role Search", { exact: true }).first()).toBeVisible();
    }
    await page.goto("/dashboard");
    await page.goBack();
    await expect(page.getByTestId("leads-search-input")).toHaveValue("Role");
    await expect(page.getByText("Role Search", { exact: true }).first()).toBeVisible();
  });

  test("deals search is shared by Pipeline and List and waits for an active drag", async ({ page }) => {
    await createDeal(page);
    await page.goto("/dashboard/deals");
    const input = page.getByTestId("deals-search-input");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("leadflow:deal-drag", { detail: true })));
    await input.fill("Northstar");
    await page.waitForTimeout(500);
    expect(new URL(page.url()).searchParams.has("search")).toBe(false);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("leadflow:deal-drag", { detail: false })));
    await expect.poll(() => new URL(page.url()).searchParams.get("search")).toBe("Northstar");
    await expect(page.getByTestId(/deal-card-/).filter({ hasText: "Northstar expansion" }).first()).toBeVisible();
    await page.getByTestId("list-view-toggle").click();
    await expect(page).toHaveURL(/view=list/);
    expect(new URL(page.url()).searchParams.get("search")).toBe("Northstar");
    await expect(page.getByTestId("deals-list")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Apply$/ })).toHaveCount(0);
  });

  test("search toolbars remain usable without page overflow on mobile", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const pages = [
      ["/dashboard/customers/accounts", "accounts-search-input"],
      ["/dashboard/customers/contacts", "contacts-search-input"],
      ["/dashboard/tasks", "tasks-search-input"],
      ["/dashboard/settings", "team-search-input"],
      ["/dashboard/settings/audit-log", "audit-log-search-input"],
      ["/dashboard/settings/imports/history", "import-history-search-input"],
    ] as const;
    for (const [url, testId] of pages) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId(testId)).toBeVisible();
      await expectNoDocumentOverflow(page);
    }
  });
});
