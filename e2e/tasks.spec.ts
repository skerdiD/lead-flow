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

async function createLead(page: Page, fullName: string) {
  await page.goto("/dashboard/leads/new");
  await page.getByTestId("lead-full-name-input").fill(fullName);
  await page.getByTestId("lead-form-submit-btn").click();
  await expect(page).toHaveURL(/\/dashboard\/leads$/);
}

test.describe("Task deletion", () => {
  test.beforeEach(async ({ request }) => {
    await resetWorkspace(request);
  });

  test("deletes a task from Tasks and removes it from its linked lead", async ({ page }) => {
    const leadName = "E2E Task Delete Lead";
    const taskTitle = "E2E task to delete";

    await createLead(page, leadName);
    await page.getByRole("link", { name: leadName, exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/leads\/.+$/);
    await expect(page.getByTestId("lead-details-page")).toBeVisible();
    const leadUrl = page.url();

    await page.getByRole("tab", { name: "Tasks", exact: true }).click();
    await page.locator("#task-title").fill(taskTitle);
    await page.getByRole("button", { name: "Add task" }).click();
    await expect(page.getByText(taskTitle, { exact: true })).toBeVisible();

    await page.goto("/dashboard/tasks");
    await expect(page.getByText(taskTitle, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: `Delete task ${taskTitle}` }).click();
    await page.getByRole("button", { name: "Delete task", exact: true }).click();
    await expect(page.getByText(taskTitle, { exact: true })).toHaveCount(0);

    await page.goto(leadUrl);
    await page.getByRole("tab", { name: "Tasks", exact: true }).click();
    await expect(page.locator("#task-title")).toBeVisible();
    await expect(page.getByText(taskTitle, { exact: true })).toHaveCount(0);
  });
});
