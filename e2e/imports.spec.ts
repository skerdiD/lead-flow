import { expect, test, type APIRequestContext } from "@playwright/test";

async function resetWorkspace(request: APIRequestContext) {
  const response = await request.post("/api/testing/e2e/reset", {
    headers: {
      "x-e2e-test-secret":
        process.env.E2E_TEST_SECRET || "leadflow-local-e2e-secret",
    },
  });
  expect(response.ok()).toBeTruthy();
}

test.describe("CSV import workflow", () => {
  test.beforeEach(async ({ request }) => {
    await resetWorkspace(request);
  });

  test("uploads, maps, reviews, confirms, and displays imported leads", async ({
    page,
  }) => {
    await page.goto("/dashboard/import");
    await expect(
      page.getByRole("heading", { name: "Import CSV" }),
    ).toBeVisible();

    await page.getByTestId("csv-file-input").setInputFiles({
      name: "e2e-leads.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        [
          "Full Name,Email,Company,Status",
          "E2E Imported Lead,imported@example.com,Import Company,Contacted",
          "Invalid Import,bad-email,Import Company,New",
        ].join("\n"),
      ),
    });

    await page.getByTestId("inspect-csv").click();
    await expect(
      page.getByRole("heading", { name: "Map CSV columns" }),
    ).toBeVisible();

    await page.getByTestId("review-csv").click();
    await expect(
      page.getByRole("heading", { name: "Review rows" }),
    ).toBeVisible();
    await expect(page.getByText("1", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("invalid", { exact: true })).toBeVisible();

    await page.getByTestId("confirm-csv").click();
    await page.getByTestId("start-import").click();
    await expect(
      page.getByRole("heading", { name: "Import complete" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "View imported leads" }).click();
    await expect(page).toHaveURL(/\/dashboard\/leads$/);
    await expect(
      page.getByRole("row").filter({ hasText: "E2E Imported Lead" }),
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: "Invalid Import" }),
    ).toHaveCount(0);
  });
});
