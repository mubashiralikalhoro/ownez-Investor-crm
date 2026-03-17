import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Pipeline View", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "chad");
    await page.click("aside >> text=Pipeline");
    await page.waitForURL(/\/pipeline/);
  });

  test("shows pipeline table with active prospects", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Pipeline" })).toBeVisible();
    // 12 prospects minus nurture(1) minus dead(1) = 10 active
    const rows = page.locator("table tbody tr");
    await expect(rows).toHaveCount(10);
  });

  test("table has correct column headers", async ({ page }) => {
    await expect(page.locator("th", { hasText: "Name" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Company" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Stage" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Initial Inv." })).toBeVisible();
  });

  test("clicking a row navigates to person detail", async ({ page }) => {
    await page.locator("a", { hasText: "Robert Calloway" }).click();
    await expect(page).toHaveURL(/\/person\/p-robert/);
  });

  test("stage filter works", async ({ page }) => {
    await page.selectOption("select >> nth=0", "active_engagement");
    // Should show Robert, Marcus, Rachel
    const rows = page.locator("table tbody tr");
    await expect(rows).toHaveCount(3);
    await expect(page.locator("table tbody")).toContainText("Robert Calloway");
    await expect(page.locator("table tbody")).toContainText("Marcus Johnson");
    await expect(page.locator("table tbody")).toContainText("Rachel Adams");
  });

  test("source filter works", async ({ page }) => {
    await page.selectOption("select >> nth=1", "velocis_network");
    // Should show Robert, Whitfield
    const rows = page.locator("table tbody tr");
    await expect(rows).toHaveCount(2);
  });

  test("stale only toggle works", async ({ page }) => {
    await page.check('input[type="checkbox"]');
    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test("clear filters button works", async ({ page }) => {
    await page.selectOption("select >> nth=0", "active_engagement");
    await expect(page.locator("table tbody tr")).toHaveCount(3);
    await page.click("text=Clear filters");
    await expect(page.locator("table tbody tr")).toHaveCount(10);
  });

  test("shows no results message with impossible filter combo", async ({ page }) => {
    await page.selectOption("select >> nth=0", "kyc_docs");
    await page.selectOption("select >> nth=1", "velocis_network");
    await expect(page.locator("text=No prospects match your filters")).toBeVisible();
  });
});
