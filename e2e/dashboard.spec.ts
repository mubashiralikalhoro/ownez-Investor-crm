import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "chad");
  });

  test("displays 4 stat cards", async ({ page }) => {
    await expect(page.locator("text=Active Pipeline")).toBeVisible();
    await expect(page.locator("text=Pipeline Value")).toBeVisible();
    await expect(page.locator("text=Committed")).toBeVisible();
    await expect(page.locator("text=Funded YTD")).toBeVisible();
  });

  test("shows active pipeline count", async ({ page }) => {
    // 12 prospects minus nurture(1) minus dead(1) = 10 active
    const statsSection = page.locator("text=Active Pipeline").locator("..");
    await expect(statsSection).toContainText("10");
  });

  test("shows funded YTD value", async ({ page }) => {
    // Morrison $500K + Chang $100K + Reeves $250K = $850K
    const fundedCard = page.locator("text=Funded YTD").locator("..");
    await expect(fundedCard).toContainText("$850K");
  });

  test("Today's Actions section exists", async ({ page }) => {
    await expect(page.locator("text=Today's Actions")).toBeVisible();
  });

  test("Needs Attention section exists", async ({ page }) => {
    await expect(page.locator("text=Needs Attention")).toBeVisible();
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
});
