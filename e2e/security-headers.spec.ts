import { expect, test } from "@playwright/test";

const importantRoutes = ["/", "/demo", "/sign-in", "/sign-up", "/api/health"];

test.describe("HTTP security headers", () => {
  for (const route of importantRoutes) {
    test(`${route} receives the enforced document policy`, async ({ request }) => {
      const response = await request.get(route);
      const csp = response.headers()["content-security-policy"];

      // The health route can legitimately return 503 when its database probe
      // reports unavailable; it must still receive the security policy.
      expect(response.status()).not.toBe(404);
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("'strict-dynamic'");
      expect(csp).not.toContain("script-src *");
      expect(response.headers()["x-content-type-options"]).toBe("nosniff");
      expect(response.headers()["referrer-policy"]).toBe(
        "strict-origin-when-cross-origin",
      );
      expect(response.headers()["cross-origin-opener-policy"]).toBe(
        "same-origin-allow-popups",
      );
      expect(response.headers()["cross-origin-resource-policy"]).toBe(
        "same-origin",
      );
      expect(response.headers()["strict-transport-security"]).toBeUndefined();
      expect(response.headers()["x-frame-options"]).toBeUndefined();
    });
  }

  test("Next assets and same-origin API calls load without CSP violations", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        /content security policy|refused to (?:load|execute|connect)/i.test(
          message.text(),
        )
      ) {
        violations.push(message.text());
      }
    });

    await page.goto("/demo");
    await expect(
      page.getByRole("heading", { name: "Explore LeadFlow by role." }),
    ).toBeVisible();
    const healthStatus = await page.evaluate(async () =>
      fetch("/api/health").then((response) => response.status),
    );
    expect(healthStatus).toBe(200);

    const asset = await page.request.get("/brand/leadflow-mark.svg");
    expect(asset.ok()).toBeTruthy();
    expect(asset.headers()["x-content-type-options"]).toBe("nosniff");
    expect(asset.headers()["cross-origin-resource-policy"]).toBe("same-origin");
    expect(violations).toEqual([]);
  });

  test("Clerk authentication routes render without CSP violations", async ({ page }) => {
    await page.addInitScript(() => {
      const testWindow = window as typeof window & { __cspViolations: string[] };
      testWindow.__cspViolations = [];
      window.addEventListener("securitypolicyviolation", (event) => {
        testWindow.__cspViolations.push(
          `${event.violatedDirective}: ${event.blockedURI}`,
        );
      });
    });

    for (const route of ["/sign-in", "/sign-up"]) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("main")).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            (window as typeof window & { __cspViolations: string[] })
              .__cspViolations,
        ),
      ).toEqual([]);
    }
  });

  test("the CSP-compatible demo authentication redirect still completes", async ({ page }) => {
    await page.goto("/demo");
    await page.getByRole("button", { name: "Continue as Admin" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Your sales pipeline." }),
    ).toBeVisible();
  });
});
