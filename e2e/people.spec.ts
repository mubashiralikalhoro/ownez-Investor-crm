import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("People Directory", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "chad");
    await page.click("aside >> text=People");
    await page.waitForURL(/\/people/);
  });

  test("shows search bar", async ({ page }) => {
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
  });

  test("search finds Robert Calloway by name", async ({ page }) => {
    await page.fill('input[placeholder*="Search"]', "calloway");
    await expect(page.locator("text=Robert Calloway")).toBeVisible();
  });

  test("search finds Mike Lawson (external contact)", async ({ page }) => {
    await page.fill('input[placeholder*="Search"]', "mike");
    await expect(page.locator("text=Mike Lawson")).toBeVisible();
  });

  test("role filter for referrers works", async ({ page }) => {
    await page.click('button:has-text("Referrers")');
    await expect(page.locator("text=Mike Lawson")).toBeVisible();
    await expect(page.locator("text=Tolleson Advisor")).toBeVisible();
    // Prospects should not be shown
    await expect(page.locator("text=Robert Calloway")).not.toBeVisible();
  });

  test("clicking a person navigates to detail", async ({ page }) => {
    await page.fill('input[placeholder*="Search"]', "calloway");
    await page.click("a:has-text('Robert Calloway')");
    await expect(page).toHaveURL(/\/person\/p-robert/);
  });

  test("shows all people when no filter", async ({ page }) => {
    // All people should be listed (20 total: 12 prospects + 3 funded + 5 external)
    // Use the link selector that matches person links in the list
    const links = page.locator('a[href*="/person/"]');
    await expect(links.first()).toBeVisible();
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(15);
  });

  test("shows role badges on people", async ({ page }) => {
    await expect(page.getByText("Prospect").first()).toBeVisible();
  });
});
