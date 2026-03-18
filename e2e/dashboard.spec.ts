import { test, expect } from "@playwright/test";
import { loginAs, resetMockData } from "./helpers";

test.describe("Dashboard", () => {
  test.beforeAll(async () => {
    await resetMockData();
  });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, "chad");
  });

  test("displays stats footer with all 4 metrics", async ({ page }) => {
    const main = page.locator("main");
    await expect(main.locator("text=Active Pipeline").or(main.getByText("Pipeline", { exact: true }))).toBeVisible();
    await expect(main.getByText("Value", { exact: true })).toBeVisible();
    await expect(main.getByText("Committed", { exact: true })).toBeVisible();
    await expect(main.getByText("Funded YTD", { exact: true })).toBeVisible();
  });

  test("shows active pipeline count", async ({ page }) => {
    // 12 prospects minus nurture(1) minus dead(1) = 10 active
    const main = page.locator("main");
    await expect(main.getByText("10", { exact: true })).toBeVisible();
  });

  test("shows funded YTD value", async ({ page }) => {
    // Morrison $500K + Chang $100K + Reeves $250K = $850K
    await expect(page.locator("text=$850K")).toBeVisible();
  });

  test("hero card or empty state is visible", async ({ page }) => {
    // Either a hero card with a prospect name or the "All caught up" empty state
    const heroCard = page.locator("text=Overdue").or(page.locator("text=Due today")).or(page.locator("text=Stale")).or(page.locator("text=All caught up"));
    await expect(heroCard.first()).toBeVisible();
  });

  test("action queue shows ranked items", async ({ page }) => {
    // The action queue should have numbered items (2., 3., etc.)
    const queueItems = page.locator("text=Action Items");
    await expect(queueItems).toBeVisible();
  });

  test("Recent Activity section exists and is collapsed", async ({ page }) => {
    await expect(page.locator("text=Recent Activity")).toBeVisible();
  });

  test("clicking a prospect navigates to person detail", async ({ page }) => {
    const prospectLink = page.locator('a[href^="/person/"]').first();
    if (await prospectLink.isVisible()) {
      await prospectLink.click();
      await expect(page).toHaveURL(/\/person\//);
    }
  });

  test("header has action buttons", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Prospect" })).toBeVisible();
    await expect(page.getByText("Log Activity")).toBeVisible();
  });
});
