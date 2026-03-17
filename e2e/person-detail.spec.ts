import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Person Detail — Robert Calloway", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "chad");
    await page.goto("/person/p-robert");
  });

  test("shows identity bar with name, org, stage, investment", async ({ page }) => {
    await expect(page.locator("h1", { hasText: "Robert Calloway" })).toBeVisible();
    await expect(page.getByText("Calloway Family Office").first()).toBeVisible();
    await expect(page.locator("span[data-slot='badge']", { hasText: "Active Engagement" })).toBeVisible();
    await expect(page.getByText("$500K").first()).toBeVisible();
  });

  test("shows phone and email links", async ({ page }) => {
    await expect(page.locator('a[href^="tel:"]')).toBeVisible();
    await expect(page.locator('a[href^="mailto:"]')).toBeVisible();
  });

  test("shows next action bar", async ({ page }) => {
    await expect(page.locator("text=Next Action")).toBeVisible();
    await expect(page.locator("text=Send Q3 performance deck")).toBeVisible();
  });

  test("shows recent snapshot with activities", async ({ page }) => {
    // Should show last 3 non-stage-change activities in the snapshot
    const snapshot = page.getByText("Coffee at Ascension").first();
    await expect(snapshot).toBeVisible();
  });

  test("shows quick log input", async ({ page }) => {
    const quickLog = page.locator('input[placeholder*="Quick log"]');
    await expect(quickLog).toBeVisible();
  });

  test("quick log detects activity type from text", async ({ page }) => {
    const quickLog = page.locator('input[placeholder*="Quick log"]');
    await quickLog.fill("Called Robert, discussed Q3 returns");
    // Should show "Call" badge
    await expect(page.locator("span", { hasText: "Call" }).first()).toBeVisible();
  });

  test("quick log detects attempted outcome", async ({ page }) => {
    const quickLog = page.locator('input[placeholder*="Quick log"]');
    await quickLog.fill("Left voicemail, no answer");
    await expect(page.locator("text=Attempted").first()).toBeVisible();
  });

  test("shows activity timeline", async ({ page }) => {
    await expect(page.locator("text=Activity Timeline")).toBeVisible();
  });

  test("timeline has filter pills", async ({ page }) => {
    await expect(page.getByText("All", { exact: true })).toBeVisible();
    await expect(page.getByText("Calls", { exact: true })).toBeVisible();
    await expect(page.getByText("Emails", { exact: true })).toBeVisible();
    await expect(page.getByText("Meetings", { exact: true })).toBeVisible();
  });

  test("shows stage progression bar", async ({ page }) => {
    await expect(page.locator("text=Stage Progression")).toBeVisible();
    await expect(page.locator("button", { hasText: "Nurture" })).toBeVisible();
    await expect(page.locator("button", { hasText: "Dead" })).toBeVisible();
  });

  test("shows organization section", async ({ page }) => {
    await expect(page.locator("h3", { hasText: "Organization" })).toBeVisible();
    await expect(page.getByText("Calloway Family Office").first()).toBeVisible();
  });

  test("shows related contacts (Mrs. Calloway)", async ({ page }) => {
    await expect(page.locator("h3", { hasText: "Related Contacts" })).toBeVisible();
    await expect(page.getByText("Mrs. Calloway").first()).toBeVisible();
  });

  test("shows prospect fields section", async ({ page }) => {
    await expect(page.locator("h3", { hasText: "Prospect Details" })).toBeVisible();
    await expect(page.locator("text=Investment Target")).toBeVisible();
    await expect(page.locator("text=Lead Source")).toBeVisible();
    await expect(page.locator("text=Assigned Rep")).toBeVisible();
  });

  test("shows background notes (collapsed)", async ({ page }) => {
    await expect(page.locator("button", { hasText: "Background Notes" })).toBeVisible();
  });

  test("back link navigates to dashboard", async ({ page }) => {
    await page.getByText("\u2190 Dashboard").click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("Person Detail — not found", () => {
  test("shows not found for invalid ID", async ({ page }) => {
    await loginAs(page, "chad");
    await page.goto("/person/nonexistent-id");
    await expect(page.locator("text=Prospect not found")).toBeVisible();
  });
});

test.describe("Person Detail — auto-synced activities", () => {
  test("shows AUTO badge on auto-synced activities", async ({ page }) => {
    await loginAs(page, "chad");
    await page.goto("/person/p-robert");

    // Click "Auto" filter in timeline
    await page.getByText("Auto", { exact: false }).last().click();

    // Should show AUTO badge
    await expect(page.locator("text=AUTO").first()).toBeVisible();
  });
});
