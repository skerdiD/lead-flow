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

async function createLead(page: Page) {
  await page.goto("/dashboard/leads/new");
  await page.getByTestId("lead-full-name-input").fill("Grace Kim");
  await page.getByTestId("lead-company-input").fill("Bluepeak Hospitality");
  await page.getByTestId("lead-source-input").fill("LinkedIn");
  await page.getByLabel("Deal name").fill("Bluepeak expansion");
  await page.getByLabel("Deal value").fill("9600");
  await page.getByLabel("Probability").fill("20");
  await page.getByLabel("Expected close date").fill("2030-07-02");
  await page.getByTestId("lead-form-submit-btn").click();
  await expect(page).toHaveURL(/\/dashboard\/leads$/);
}

async function openLeadDetails(page: Page) {
  await page.getByRole("link", { name: "Grace Kim", exact: true }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/leads\/.+$/);
  await expect(page.getByTestId("lead-details-page")).toBeVisible();
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

async function openGlobalCreateAction(page: Page, action: string) {
  await page.getByRole("button", { name: "Create a CRM record" }).click();
  await page.getByRole("menuitem", { name: action }).click();
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

  test("global create shortcuts reset the dashboard scroll and retain its chrome", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const action of [
      { label: "New lead", path: "/dashboard/leads/new" },
      { label: "New deal", path: "/dashboard/deals/new" },
      { label: "New account", path: "/dashboard/customers/accounts/new" },
      { label: "New contact", path: "/dashboard/customers/contacts/new" },
    ]) {
      await page.goto("/dashboard/leads");
      await expect
        .poll(() => page.evaluate(() => document.documentElement.style.overflow))
        .toBe("hidden");
      const scrollFixture = await page.addStyleTag({
        content:
          '[data-testid="dashboard-scroll-region"] > div { height: 200vh !important; }',
      });
      const scrollRegion = page.getByTestId("dashboard-scroll-region");
      await expect
        .poll(() =>
          scrollRegion.evaluate((element) => element.scrollHeight > element.clientHeight),
        )
        .toBe(true);
      await scrollRegion.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await expect
        .poll(() =>
          scrollRegion.evaluate((element) => element.scrollTop > 0),
        )
        .toBe(true);

      await openGlobalCreateAction(page, action.label);

      await expect(page).toHaveURL(new RegExp(`${action.path}$`));
      await scrollFixture.evaluate((element) =>
        element.parentNode?.removeChild(element),
      );
      await expect(page.locator("header").first()).toBeVisible();
      await expect(page.getByTestId("desktop-sidebar")).toBeVisible();
      await expect
        .poll(() =>
          scrollRegion.evaluate((element) => element.scrollTop),
        )
        .toBe(0);
    }
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

  test("Lead details uses independent content stacks without a desktop gap or responsive overflow", async ({ page }) => {
    await createLead(page);
    await openLeadDetails(page);

    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
    ]) {
      await page.setViewportSize(viewport);

      const detailsPage = page.getByTestId("lead-details-page");
      const main = page.getByTestId("lead-details-main");
      const sidebar = page.getByTestId("lead-details-sidebar");
      const profileContext = page.getByTestId("lead-profile-context-section");
      const tasks = page.locator("#lead-tasks");
      const notes = page.locator("#lead-notes");
      const activity = page.locator("#lead-activity");

      await expect(detailsPage).toBeVisible();
      await expect(sidebar).toBeVisible();
      await expect(tasks).toBeVisible();
      await expectNoDocumentOverflow(page);

      const [pageBox, mainBox, sidebarBox, profileBox, tasksBox, notesBox, activityBox] = await Promise.all([
        detailsPage.boundingBox(),
        main.boundingBox(),
        sidebar.boundingBox(),
        profileContext.boundingBox(),
        tasks.boundingBox(),
        notes.boundingBox(),
        activity.boundingBox(),
      ]);

      expect(pageBox).not.toBeNull();
      expect(mainBox).not.toBeNull();
      expect(sidebarBox).not.toBeNull();
      expect(profileBox).not.toBeNull();
      expect(tasksBox).not.toBeNull();
      expect(notesBox).not.toBeNull();
      expect(activityBox).not.toBeNull();
      expect(pageBox!.width).toBeLessThanOrEqual(1481);
      expect(mainBox!.x).toBeLessThan(sidebarBox!.x);
      expect(sidebarBox!.width).toBeGreaterThanOrEqual(340);
      expect(sidebarBox!.width).toBeLessThanOrEqual(401);
      expect(tasksBox!.y - (profileBox!.y + profileBox!.height)).toBeLessThanOrEqual(24);
      expect(tasksBox!.y).toBeLessThan(sidebarBox!.y + sidebarBox!.height);
      expect(notesBox!.x).toBeLessThan(activityBox!.x);
      expect(Math.abs(notesBox!.y - activityBox!.y)).toBeLessThanOrEqual(1);
      expect(
        await main.evaluate((element, taskId) => {
          const task = document.getElementById(taskId);
          return Boolean(task && element.contains(task));
        }, "lead-tasks"),
      ).toBe(true);
    }

    for (const viewport of [
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);

      const mainBox = await page.getByTestId("lead-details-main").boundingBox();
      const sidebarBox = await page.getByTestId("lead-details-sidebar").boundingBox();
      const notesBox = await page.locator("#lead-notes").boundingBox();
      const activityBox = await page.locator("#lead-activity").boundingBox();

      expect(mainBox).not.toBeNull();
      expect(sidebarBox).not.toBeNull();
      expect(notesBox).not.toBeNull();
      expect(activityBox).not.toBeNull();
      expect(Math.abs(mainBox!.x - sidebarBox!.x)).toBeLessThanOrEqual(1);
      expect(sidebarBox!.y).toBeLessThan(mainBox!.y);
      expect(Math.abs(notesBox!.x - activityBox!.x)).toBeLessThanOrEqual(1);
      expect(notesBox!.y).toBeLessThan(activityBox!.y);
      await expect(page.getByLabel("Date")).toBeVisible();
      await expect(page.getByLabel("Follow-up note")).toBeVisible();
      await expect(page.getByText("$9,600")).toBeVisible();
      await expectNoDocumentOverflow(page);
    }
  });

  test("Lead details keeps assigned-record controls permission-aware for every workspace role", async ({ page }) => {
    await createLead(page);
    await openLeadDetails(page);
    const detailsUrl = page.url();
    const origin = new URL(detailsUrl).origin;

    for (const role of ["owner", "admin", "member"] as const) {
      await page.context().addCookies([
        { name: roleCookieName, value: role, url: origin },
      ]);
      await page.goto(detailsUrl);

      await expect(page.getByRole("heading", { name: "Grace Kim" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Edit lead" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Save follow-up" })).toBeDisabled();

      if (role === "member") {
        await expect(page.getByRole("button", { name: "Archive" })).toHaveCount(0);
      } else {
        await expect(page.getByRole("button", { name: "Archive" })).toBeVisible();
      }
    }
  });

  test("Lead detail follow-up, opportunity, and task workflows remain functional", async ({ page }) => {
    await createLead(page);
    await openLeadDetails(page);

    const followUp = page.locator("#lead-follow-up");
    const followUpDate = followUp.getByLabel("Date", { exact: true });
    const followUpNote = followUp.getByLabel("Follow-up note");

    await followUp.getByRole("button", { name: "Tomorrow" }).click();
    await expect(followUpDate).not.toHaveValue("");
    await followUpNote.fill("Confirm the proposal review with the buying team.");
    await followUp.getByRole("button", { name: "Save follow-up" }).click();
    await expect(page.getByText("Follow-up updated.")).toBeVisible();
    await expect(followUpNote).toHaveValue("Confirm the proposal review with the buying team.");

    await followUp.getByRole("button", { name: "Clear" }).click();
    await expect(followUpDate).toHaveValue("");
    await expect(followUpNote).toHaveValue("");
    await followUp.getByRole("button", { name: "Save follow-up" }).click();
    await expect(page.getByText("Follow-up cleared.")).toBeVisible();

    const opportunity = page.locator("#lead-opportunity");
    await opportunity.getByRole("combobox", { name: "Deal stage" }).click();
    await page.getByRole("option", { name: "Qualified" }).click();
    await opportunity.getByRole("button", { name: "Apply stage" }).click();
    await expect(page.getByText("Deal stage updated to qualified.")).toBeVisible();

    const tasks = page.locator("#lead-tasks");
    await tasks.getByLabel("Title").fill("Send revised proposal");
    await tasks.getByLabel("Due date").fill("2030-07-03");
    await tasks.getByRole("button", { name: "Add task" }).click();
    await expect(page.getByText("Follow-up task created.")).toBeVisible();

    const task = tasks.getByRole("article").filter({ hasText: "Send revised proposal" });
    await expect(task).toBeVisible();
    await expect(tasks.getByText("No overdue tasks")).toHaveCount(0);
    await expect(tasks.getByText("No tasks due today")).toHaveCount(0);
    await expect(tasks.getByText("No completed tasks yet")).toHaveCount(0);
    await task.getByRole("button", { name: "Mark complete" }).click();
    await expect(page.getByText("Task marked complete.")).toBeVisible();
    await expect(task.getByRole("button", { name: "Reopen" })).toBeVisible();
  });

  test("Deals fits every desktop stage without horizontal scrolling and supports List view", async ({ page }) => {
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
    expect(boardDimensions.scrollWidth).toBeLessThanOrEqual(boardDimensions.clientWidth);

    const finalColumn = page.getByTestId("deal-column-lost");
    await expect(finalColumn).toBeVisible();
    const finalColumnBox = await finalColumn.boundingBox();
    const viewportBox = await viewport.boundingBox();
    expect(finalColumnBox).not.toBeNull();
    expect(viewportBox).not.toBeNull();
    expect(finalColumnBox!.x + finalColumnBox!.width).toBeLessThanOrEqual(
      viewportBox!.x + viewportBox!.width + 1,
    );
    const card = page.getByTestId(/deal-card-/).filter({ hasText: "Bluepeak expansion" }).first();
    await expect(card.getByText("Test user")).toBeVisible();
    await expect(page.getByText("e2e-user")).toHaveCount(0);
    await expect(card.getByRole("button", { name: /Move/ })).toHaveCount(0);

    await page.getByTestId("list-view-toggle").click();
    await expect(page.getByTestId("deals-list")).toBeVisible();
    await expectNoDocumentOverflow(page);
    await expect(page.getByTestId("deals-desktop-table")).toBeVisible();
  });

  test("Deals can be dragged between stages and the move persists", async ({ page }) => {
    await createDeal(page);
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/dashboard/deals");

    const dragHandle = page.getByRole("button", { name: "Drag Bluepeak expansion" });
    const targetColumn = page.getByTestId("deal-column-qualified");
    const [handleBox, targetBox] = await Promise.all([
      dragHandle.boundingBox(),
      targetColumn.boundingBox(),
    ]);

    expect(handleBox).not.toBeNull();
    expect(targetBox).not.toBeNull();
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      targetBox!.x + targetBox!.width / 2,
      targetBox!.y + Math.min(160, targetBox!.height / 2),
      { steps: 12 },
    );
    await page.mouse.up();

    await expect(
      targetColumn.getByText("Bluepeak expansion", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Deal stage updated.")).toBeVisible();

    await page.reload();
    await expect(
      page.getByTestId("deal-column-qualified").getByText("Bluepeak expansion", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByTestId("deal-column-new").getByText("Bluepeak expansion", { exact: true }),
    ).toHaveCount(0);
  });

  test("Deals mobile pipeline shows one accessible stage and keeps movement in the action menu", async ({ page }) => {
    await createDeal(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/deals");

    await expect(page.getByTestId("mobile-deals-pipeline")).toBeVisible();
    await expect(page.getByTestId("pipeline-scroll-viewport")).toBeHidden();
    await expect(page.getByRole("combobox", { name: "Pipeline stage" })).toBeVisible();
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
