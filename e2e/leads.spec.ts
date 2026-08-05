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

async function createLead(
  page: Page,
  values: {
    fullName: string;
    company?: string;
    email?: string;
    source?: string;
  },
) {
  await page.goto("/dashboard/leads/new");
  await page.getByTestId("lead-full-name-input").fill(values.fullName);

  if (values.company) {
    await page.getByTestId("lead-company-input").fill(values.company);
  }

  if (values.email) {
    await page.getByTestId("lead-email-input").fill(values.email);
  }

  if (values.source) {
    await page.getByTestId("lead-source-input").fill(values.source);
  }

  await page.getByTestId("lead-form-submit-btn").click();
  await expect(page).toHaveURL(/\/dashboard\/leads$/);
}

async function seedNotification(request: APIRequestContext) {
  const response = await request.post("/api/testing/e2e/notifications", {
    headers: {
      "x-e2e-test-secret":
        process.env.E2E_TEST_SECRET || "leadflow-local-e2e-secret",
    },
  });
  expect(response.ok()).toBeTruthy();
}

test.describe("Leads e2e flows", () => {
  test.beforeEach(async ({ request }) => {
    await resetWorkspace(request);
  });

  test("authenticated test user can access dashboard and leads", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page
      .getByTestId("desktop-sidebar")
      .getByRole("link", { name: "Leads", exact: true })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/leads$/);
    await expect(
      page
        .getByTestId("dashboard-scroll-region")
        .getByRole("heading", { name: "Leads", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "No leads yet", exact: true })).toBeVisible();
  });

  test("lead filters wrap without horizontal overflow at a compact desktop width", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/dashboard/leads");

    const toolbar = page.getByTestId("leads-filter-toolbar");
    await expect(toolbar.getByRole("combobox", { name: "Owner" })).toBeVisible();

    const dimensions = await toolbar.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

    const ownerFont = await toolbar
      .getByRole("combobox", { name: "Owner" })
      .evaluate((element) => getComputedStyle(element).fontFamily);
    expect(ownerFont).not.toMatch(/fraunces/i);
  });

  test("notification bell opens the empty state", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("button", { name: "Notifications" }).click();
    await expect(page.getByText("all caught up")).toBeVisible();
    await expect(page.getByText("New updates will appear here.")).toBeVisible();
  });

  test("opening a notification marks it as read and follows its action", async ({ page, request }) => {
    await page.goto("/dashboard");
    await seedNotification(request);
    await page.reload();

    await page.getByRole("button", { name: "1 unread notification" }).click();
    await page.getByRole("menuitem", { name: /Task due today/ }).click();

    await expect(page).toHaveURL(/\/dashboard\/tasks$/);
    await expect(page.getByRole("button", { name: "Notifications" })).toBeVisible();
  });

  test("create, edit, change status, archive lead and verify dashboard refresh", async ({ page }) => {
    const leadName = "E2E Lead Alpha";
    const updatedCompany = "E2E Updated Company";

    await createLead(page, {
      fullName: leadName,
      company: "E2E Initial Company",
      email: "alpha@example.com",
      source: "Website",
    });

    const leadRow = page.getByRole("row").filter({ hasText: leadName });
    await expect(leadRow).toBeVisible();

    await leadRow.getByRole("checkbox").check();
    await page.getByTestId("bulk-status-select").click();
    await page.getByRole("option", { name: "Contacted" }).click();
    await page.getByTestId("bulk-apply-stage-btn").click();
    await expect(leadRow.getByText("Contacted")).toBeVisible();

    await leadRow.getByRole("button", { name: `Actions for ${leadName}` }).click();
    await page.getByRole("menuitem", { name: "Edit lead" }).click();
    await expect(page).toHaveURL(/\/dashboard\/leads\/.+\/edit$/);
    await page.getByTestId("lead-company-input").fill(updatedCompany);
    await page.getByTestId("lead-status-select").click();
    await page.getByRole("option", { name: "Interested" }).click();
    await page.getByTestId("lead-form-submit-btn").click();

    await expect(page).toHaveURL(/\/dashboard\/leads\/.+$/);
    await expect(page.getByTestId("lead-status-select")).toContainText("Interested");
    await expect(page.getByTestId("lead-context-section").getByText(updatedCompany)).toBeVisible();

    await page.getByRole("button", { name: "Archive" }).click();
    await page.getByRole("button", { name: "Archive lead" }).click();
    await expect(page).toHaveURL(/\/dashboard\/leads$/);
    await expect(page.getByRole("row").filter({ hasText: leadName })).toHaveCount(0);

    await page.goto("/dashboard");
    await expect(page.getByText("0 total leads")).toBeVisible();
  });

  test("exports leads in CSV and PDF formats", async ({ page }) => {
    await createLead(page, {
      fullName: "E2E Export Lead",
      company: "Export Co",
      email: "export@example.com",
      source: "Referral",
    });

    await page.goto("/dashboard/leads");

    await page.getByTestId("export-all-leads").click();
    const csvDownloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-all-leads-csv").click();
    const csvDownload = await csvDownloadPromise;
    expect(csvDownload.suggestedFilename()).toContain(".csv");

    await page.getByTestId("export-all-leads").click();
    const pdfDownloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-all-leads-pdf").click();
    const pdfDownload = await pdfDownloadPromise;
    expect(pdfDownload.suggestedFilename()).toContain(".pdf");
  });
});
