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

test.describe("Workspace invitations", () => {
  test.beforeEach(async ({ request }) => {
    await resetWorkspace(request);
  });

  test("creates a shareable invitation link when transactional email is unavailable", async ({ page }) => {
    const email = `invitee-${Date.now()}@example.com`;

    await page.goto("/dashboard/settings");
    await page.getByLabel("Invite teammate").fill(email);
    await page.getByRole("button", { name: "Invite", exact: true }).click();

    await expect(page.getByText("Email delivery is unavailable", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Invite link")).toHaveValue(/\/invite\/[A-Za-z0-9_-]{20,}/);
  });
});
