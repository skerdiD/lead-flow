import { expect, test } from "@playwright/test";

test.describe("demo role selection", () => {
  test("renders the three role perspectives with keyboard-accessible actions", async ({ page }) => {
    await page.goto("/demo");

    await expect(
      page.getByRole("heading", { name: "Explore LeadFlow by role." }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Owner" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Member" })).toBeVisible();
    await expect(page.getByText("Transfer ownership and manage workspace settings")).toBeVisible();
    await expect(page.getByText("Cannot transfer ownership, delete the workspace, or manage billing")).toBeVisible();
    await expect(page.getByText("Cannot delete records, export data, or manage workspace settings")).toBeVisible();

    const ownerButton = page.getByRole("button", { name: "Continue as Owner" });
    await ownerButton.focus();
    await expect(ownerButton).toBeFocused();
  });

  test("shows a selected loading state and disables every role action during login", async ({ page }) => {
    let releaseRequest: (() => void) | undefined;
    const requestHeld = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });

    await page.route("**/api/demo-login", async (route) => {
      await requestHeld;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "We couldn't prepare this demo role right now. Please try again." }),
      });
    });
    await page.goto("/demo");

    const ownerButton = page.getByRole("button", { name: "Continue as Owner" });
    const click = ownerButton.click();
    await expect(page.getByRole("button", { name: /Preparing Owner demo/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Continue as Admin" })).toBeDisabled();
    await expect(page.getByText("Signing you into the demo workspace…")).toBeVisible();

    releaseRequest?.();
    await click;
    await expect(page.getByText("We couldn't prepare this demo role right now. Please try again.")).toBeVisible();
  });

  test("shows an inline failure that can be retried", async ({ page }) => {
    let attempts = 0;
    await page.route("**/api/demo-login", async (route) => {
      attempts += 1;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "We couldn't prepare this demo role right now. Please try again." }),
      });
    });
    await page.goto("/demo");

    const memberButton = page.getByRole("button", { name: "Continue as Member" });
    await memberButton.click();
    await expect(page.getByText("We couldn't prepare this demo role right now. Please try again.")).toBeVisible();
    await expect(memberButton).toBeEnabled();

    await memberButton.click();
    await expect.poll(() => attempts).toBe(2);
  });

  test("redirects after the server returns a fixed sign-in destination", async ({ page }) => {
    await page.route("**/api/demo-login", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ signInUrl: "/dashboard" }),
      });
    });
    await page.goto("/demo");
    await page.getByRole("button", { name: "Continue as Admin" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("uses the local E2E role switch without contacting the auth provider", async ({
    page,
  }) => {
    await page.goto("/demo");
    await page.getByRole("button", { name: "Continue as Admin" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect
      .poll(async () =>
        (await page.context().cookies()).find(
          (cookie) => cookie.name === "leadflow_e2e_workspace_role",
        )?.value,
      )
      .toBe("admin");
  });

  test("stacks the role cards without horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/demo");

    await expect(page.getByRole("heading", { name: "Member" })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  });
});
