import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const viewports = [
  { name: "laptop", width: 1366, height: 768 },
  { name: "tablet-landscape", width: 1024, height: 768 },
  { name: "tablet-portrait", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
  { name: "small-mobile", width: 360, height: 800 },
] as const;

async function resetWorkspace(request: APIRequestContext) {
  const response = await request.post("/api/testing/e2e/reset", {
    headers: { "x-e2e-test-secret": process.env.E2E_TEST_SECRET || "leadflow-local-e2e-secret" },
  });
  expect(response.ok()).toBeTruthy();
}

async function expectNoPageOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

async function createResponsiveLead(page: Page) {
  await page.goto("/dashboard/leads/new");
  await page.getByTestId("lead-full-name-input").fill("Responsive Audit Lead");
  await page.getByTestId("lead-company-input").fill("A Company With A Long Responsive Name");
  await page.getByTestId("lead-email-input").fill("responsive.audit@example.com");
  await page.getByTestId("lead-form-submit-btn").click();
  await expect(page).toHaveURL(/\/dashboard\/leads$/);
}

async function createResponsiveDeal(page: Page) {
  await page.goto("/dashboard/deals/new");
  const form = page.locator("form");
  await form.getByLabel("Deal name *").fill("Responsive Pipeline Deal");
  await form.getByLabel("Value *").fill("12000");
  await form.getByLabel("Expected close").fill("2030-08-15");
  await form.getByRole("button", { name: "Create deal", exact: true }).click();
  await expect(page.locator("[data-sonner-toast]")).toContainText("Deal created.");
  await expect(page).toHaveURL(/\/dashboard\/deals\/[0-9a-f-]+$/, { timeout: 30_000 });
}

test.describe("complete responsive UX audit", () => {
  test.setTimeout(120_000);
  test.beforeEach(async ({ request }) => resetWorkspace(request));

  test("dashboard chrome, navigation, and workspace switching work at every target viewport", async ({ page }, testInfo) => {
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { name: "Your sales pipeline." })).toBeVisible();
      await expect(page.getByLabel("Switch workspace")).toBeVisible();
      await expectNoPageOverflow(page);

      if (viewport.width < 1024) {
        const trigger = page.getByRole("button", { name: "Open navigation" });
        await trigger.click();
        const drawer = page.getByRole("dialog", { name: "LeadFlow navigation" });
        await expect(drawer).toBeVisible();
        await expect(drawer.getByRole("link", { name: "Dashboard", exact: true })).toHaveAttribute("aria-current", "page");
        await page.keyboard.press("Tab");
        expect(await drawer.evaluate((element) => element.contains(document.activeElement))).toBe(true);
        await page.keyboard.press("Escape");
        await expect(drawer).toBeHidden();
        await expect(trigger).toBeFocused();
      } else {
        await expect(page.getByTestId("desktop-sidebar")).toBeVisible();
      }

      await testInfo.attach(`dashboard-${viewport.name}`, {
        body: await page.screenshot({ fullPage: false }),
        contentType: "image/png",
      });
    }
  });

  test("lead list, form, detail, and pipeline adapt without losing actions", async ({ page }) => {
    await createResponsiveLead(page);
    await createResponsiveDeal(page);

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/dashboard/leads");
      await expect(page.getByTestId("leads-search-input")).toBeVisible();
      await expectNoPageOverflow(page);
      if (viewport.width < 640) {
        await expect(page.getByTestId("leads-mobile-list")).toBeVisible();
        await page.getByRole("button", { name: /^Filters/ }).click();
        await expect(page.getByRole("dialog", { name: "Filter results" })).toBeVisible();
        await expect(page.getByLabel("Stage")).toBeVisible();
        await page.keyboard.press("Escape");
      } else {
        await expect(page.getByTestId("leads-desktop-table")).toBeVisible();
      }

      const detailHref = await page.getByRole("link", { name: /Responsive Audit Lead/ }).first().getAttribute("href");
      expect(detailHref).toMatch(/^\/dashboard\/leads\/[0-9a-f-]+$/);
      await page.goto(detailHref!);
      await expect(page.getByTestId("lead-details-page")).toBeVisible();
      await expect(page.getByRole("tab", { name: "Deal" })).toBeVisible();
      await expectNoPageOverflow(page);

      await page.goto("/dashboard/leads/new");
      await expect(page.getByTestId("lead-full-name-input")).toBeVisible();
      await expect(page.getByTestId("lead-form-submit-btn")).toBeVisible();
      await expectNoPageOverflow(page);

      await page.goto("/dashboard/deals");
      await expectNoPageOverflow(page);
      if (viewport.width < 768) {
        await expect(page.getByTestId("mobile-deals-pipeline")).toBeVisible();
        await expect(page.getByRole("combobox", { name: "Pipeline stage" })).toBeVisible();
      } else {
        const pipeline = page.getByTestId("pipeline-scroll-viewport");
        await expect(pipeline).toBeVisible();
        expect(await pipeline.evaluate((element) => element.scrollWidth >= element.clientWidth)).toBe(true);
      }
    }
  });

  test("import workflow and team management remain usable on the smallest viewport", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/dashboard/import");
    await expectNoPageOverflow(page);
    await page.getByTestId("csv-file-input").setInputFiles({
      name: "responsive.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("Full Name,Email\nMobile Import,mobile@example.com"),
    });
    await page.getByTestId("inspect-csv").click();
    await expect(page.getByRole("heading", { name: "Map CSV columns" })).toBeVisible();
    await page.getByTestId("review-csv").click();
    await page.getByTestId("confirm-csv").click();
    const confirmation = page.getByRole("alertdialog");
    await expect(confirmation).toBeVisible();
    await expect(page.getByTestId("start-import")).toBeVisible();
    const box = await confirmation.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(800);
    await page.keyboard.press("Escape");

    await page.goto("/dashboard/settings");
    await expect(page.getByLabel("Invite teammate")).toBeVisible();
    await expect(page.getByTestId("team-search-input")).toBeVisible();
    await expectNoPageOverflow(page);
  });
});
