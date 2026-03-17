import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("End-to-End Workflow — Chad's Morning Routine", () => {
  test("full login → dashboard → person → quick log → back workflow", async ({ page }) => {
    // 1. Login
    await loginAs(page, "chad");

    // 2. Dashboard loads with stats
    await expect(page.locator("text=Active Pipeline")).toBeVisible();
    await expect(page.locator("text=Funded YTD")).toBeVisible();

    // 3. Navigate to Robert Calloway
    await page.goto("/person/p-robert");
    await expect(page.locator("h1", { hasText: "Robert Calloway" })).toBeVisible();

    // 4. Person Detail Cockpit loads
    await expect(page.locator("text=Next Action")).toBeVisible();
    await expect(page.locator('input[placeholder*="Quick log"]')).toBeVisible();

    // 5. Type in Quick Log
    const quickLog = page.locator('input[placeholder*="Quick log"]');
    await quickLog.fill("Called Robert, discussed Q3 returns. Interested in Fund V details.");

    // 6. Verify badge shows "Call" type
    await expect(page.locator("span:has-text('Call')").first()).toBeVisible();

    // 7. Press Enter to log
    await quickLog.press("Enter");

    // 8. Next Action prompt should appear
    await expect(page.locator("text=Confirm")).toBeVisible({ timeout: 5000 });

    // 9. Click Tomorrow chip and confirm
    await page.click("button:has-text('Tomorrow')");
    await page.click("button:has-text('Confirm')");

    // 10. Quick Log should reset
    await expect(quickLog).toHaveValue("");

    // 11. Navigate back to Dashboard
    await page.click("aside >> text=Dashboard");
    await expect(page).toHaveURL("/");
    await expect(page.locator("text=Active Pipeline")).toBeVisible();

    // 12. Navigate to Pipeline
    await page.click("aside >> text=Pipeline");
    await expect(page).toHaveURL(/\/pipeline/);
    await expect(page.locator("text=Robert Calloway")).toBeVisible();

    // 13. Navigate to People → search → back to person
    await page.click("aside >> text=People");
    await page.fill('input[placeholder*="Search"]', "calloway");
    await page.click("a:has-text('Robert Calloway')");
    await expect(page).toHaveURL(/\/person\/p-robert/);
  });

  test("next action bar inline editing", async ({ page }) => {
    await loginAs(page, "chad");
    await page.goto("/person/p-robert");

    // Click on next action bar to start editing
    const nextActionBar = page.locator("text=Next Action").locator("..");
    await nextActionBar.click();

    // Should show editable fields
    await expect(page.locator("button:has-text('Save')")).toBeVisible();
    await expect(page.locator("button:has-text('Cancel')")).toBeVisible();

    // Cancel editing
    await page.click("button:has-text('Cancel')");
  });
});
