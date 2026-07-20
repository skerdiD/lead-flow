import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

async function resetWorkspace(request: APIRequestContext) {
  const response = await request.post("/api/testing/e2e/reset", {
    headers: {
      "x-e2e-test-secret":
        process.env.E2E_TEST_SECRET || "leadflow-local-e2e-secret",
    },
  });
  expect(response.ok()).toBeTruthy();
}

async function createLead(page: Page) {
  await page.goto("/dashboard/leads/new");
  await page.getByTestId("lead-full-name-input").fill("Grace Kim");
  await page.getByTestId("lead-company-input").fill("Bluepeak Hospitality");
  await page.getByTestId("lead-source-input").fill("LinkedIn");
  await page.getByTestId("lead-form-submit-btn").click();
  await expect(page).toHaveURL(/\/dashboard\/leads$/);
}

async function createDeal(page: Page) {
  await page.goto("/dashboard/deals/new");
  const form = page.locator("form");
  await form.getByLabel("Deal name *").fill("Bluepeak expansion");
  await form.getByLabel("Value *").fill("9600");
  await form.getByLabel("Expected close").fill("2030-07-02");
  await form.getByRole("button", { name: "Create deal", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/deals\/.+$/);
}

async function expectNoDocumentOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
}

test.describe("CRM responsive layouts", () => {
  test.beforeEach(async ({ request }) => {
    await resetWorkspace(request);
  });

  test("Leads fits normal desktop viewports with one company label and compact actions", async ({ page }) => {
    await createLead(page);

    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
      { width: 1280, height: 800 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/dashboard/leads");

      const table = page.getByTestId("leads-desktop-table");
      await expect(table).toBeVisible();
      await expectNoDocumentOverflow(page);
      const tableDimensions = await table.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(tableDimensions.scrollWidth).toBeLessThanOrEqual(
        tableDimensions.clientWidth,
      );
    }

    const table = page.getByTestId("leads-desktop-table");
    await expect(table.getByRole("columnheader", { name: "Lead" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Status" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Next follow-up" })).toBeVisible();
    await expect(table.getByText("Bluepeak Hospitality")).toHaveCount(1);
    await expect(table.getByText("Test user")).toBeVisible();
    await expect(page.getByText("e2e-user")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Actions for Grace Kim" })).toBeVisible();
  });

  test("Leads uses navigable cards without mobile page overflow", async ({ page }) => {
    await createLead(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/leads");

    await expect(page.getByTestId("leads-mobile-list")).toBeVisible();
    await expect(page.getByTestId("leads-desktop-table")).toBeHidden();
    await expectNoDocumentOverflow(page);

    const before = page.url();
    await page.getByRole("button", { name: "Actions for Grace Kim" }).click();
    await expect(page.getByRole("menuitem", { name: "View details" })).toBeVisible();
    expect(page.url()).toBe(before);
    await page.keyboard.press("Escape");

    await page.getByTestId(/lead-card-link-/).click();
    await expect(page).toHaveURL(/\/dashboard\/leads\/.+$/);
  });

  test("Deals contains horizontal scrolling inside the pipeline and supports List view", async ({ page }) => {
    await createDeal(page);
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/dashboard/deals");

    const viewport = page.getByTestId("pipeline-scroll-viewport");
    await expect(viewport).toBeVisible();
    await expectNoDocumentOverflow(page);

    const boardDimensions = await viewport.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(boardDimensions.scrollWidth).toBeGreaterThan(boardDimensions.clientWidth);

    await viewport.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    const finalColumn = page.getByTestId("deal-column-lost");
    await expect(finalColumn).toBeVisible();
    const finalColumnBox = await finalColumn.boundingBox();
    const viewportBox = await viewport.boundingBox();
    expect(finalColumnBox).not.toBeNull();
    expect(viewportBox).not.toBeNull();
    expect(finalColumnBox!.x + finalColumnBox!.width).toBeLessThanOrEqual(
      viewportBox!.x + viewportBox!.width + 1,
    );
    await viewport.evaluate((element) => {
      element.scrollLeft = 0;
    });

    const card = page.getByTestId(/deal-card-/).filter({ hasText: "Bluepeak expansion" }).first();
    await expect(card.getByText("Test user")).toBeVisible();
    await expect(page.getByText("e2e-user")).toHaveCount(0);
    await expect(card.getByRole("button", { name: /Move/ })).toHaveCount(0);

    await page.getByTestId("list-view-toggle").click();
    await expect(page.getByTestId("deals-list")).toBeVisible();
    await expectNoDocumentOverflow(page);
    await expect(page.getByTestId("deals-desktop-table")).toBeVisible();
  });

  test("Deals mobile pipeline shows one accessible stage and keeps movement in the action menu", async ({ page }) => {
    await createDeal(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/deals");

    await expect(page.getByTestId("mobile-deals-pipeline")).toBeVisible();
    await expect(page.getByTestId("pipeline-scroll-viewport")).toBeHidden();
    await expect(page.getByLabel("Pipeline stage")).toBeVisible();
    await expect(page.getByRole("link", { name: "Create deal", exact: true })).toBeVisible();
    await expectNoDocumentOverflow(page);

    await page.getByRole("button", { name: "Actions for Bluepeak expansion" }).click();
    await expect(page.getByText("Move to stage")).toBeVisible();
  });

  test("Lost movement can be cancelled without changing the deal", async ({ page }) => {
    await createDeal(page);
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/dashboard/deals");

    await page.getByRole("button", { name: "Actions for Bluepeak expansion" }).first().click();
    await page.getByText("Move to stage").hover();
    await page.getByRole("menuitem", { name: "Lost" }).click();
    await expect(page.getByRole("dialog", { name: "Mark deal as lost" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(
      page.getByTestId("deal-column-new").getByText("Bluepeak expansion"),
    ).toBeVisible();
    await expect(
      page.getByTestId("deal-column-lost").getByText("Bluepeak expansion"),
    ).toHaveCount(0);
  });
});
