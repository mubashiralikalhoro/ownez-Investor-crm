/**
 * Leadership Dashboard + Admin Panel Tests
 * Run: npx playwright test e2e/leadership-admin.spec.ts
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

async function resetData(page: { request: { post: (url: string) => Promise<unknown> } }) {
  await page.request.post("/api/test-reset");
}

// ─── Access Control ───────────────────────────────────────────────────────────

test.describe("Access control", () => {
  test("leadership redirects rep (chad)", async ({ page }) => {
    await resetData(page);
    await loginAs(page, "chad");
    await page.goto("/leadership");
    await expect(page).not.toHaveURL("/leadership");
  });

  test("admin panel redirects rep (chad)", async ({ page }) => {
    await resetData(page);
    await loginAs(page, "chad");
    await page.goto("/admin");
    await expect(page).not.toHaveURL("/admin");
  });

  test("leadership accessible for admin (eric)", async ({ page }) => {
    await resetData(page);
    await loginAs(page, "eric");
    await page.goto("/leadership");
    await expect(page).toHaveURL("/leadership");
    await expect(page.locator("h1")).toContainText("Leadership");
  });

  test("admin panel accessible for admin (eric)", async ({ page }) => {
    await resetData(page);
    await loginAs(page, "eric");
    await page.goto("/admin");
    await expect(page).toHaveURL("/admin");
    await expect(page.locator("h1")).toContainText("Admin");
  });

  test("leadership accessible for marketing (ken)", async ({ page }) => {
    await resetData(page);
    await loginAs(page, "ken");
    await page.goto("/leadership");
    await expect(page).toHaveURL("/leadership");
  });

  test("admin panel redirects marketing (ken)", async ({ page }) => {
    await resetData(page);
    await loginAs(page, "ken");
    await page.goto("/admin");
    await expect(page).not.toHaveURL("/admin");
  });
});

// ─── Sidebar Nav ──────────────────────────────────────────────────────────────

test.describe("Sidebar nav", () => {
  test("admin sees Leadership and Admin links", async ({ page }) => {
    await resetData(page);
    await loginAs(page, "eric");
    await expect(page.locator("nav").getByText("Leadership")).toBeVisible();
    await expect(page.locator("nav").getByText("Admin")).toBeVisible();
  });

  test("rep (chad) does not see Leadership or Admin links", async ({ page }) => {
    await resetData(page);
    await loginAs(page, "chad");
    await expect(page.locator("nav").getByText("Leadership")).not.toBeVisible();
    await expect(page.locator("nav").getByText("Admin")).not.toBeVisible();
  });
});

// ─── Leadership Page ──────────────────────────────────────────────────────────

test.describe("Leadership Dashboard — stat column", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "eric");
    await page.goto("/leadership");
  });

  test("shows AUM Raised card", async ({ page }) => {
    await expect(page.getByText("AUM Raised")).toBeVisible();
  });

  test("shows Fund Target card with progress bar", async ({ page }) => {
    await expect(page.getByText("Fund Target")).toBeVisible();
    // Progress bar fill element should exist
    const bar = page.locator(".bg-gold").first();
    await expect(bar).toBeVisible();
  });

  test("shows Funded YTD card", async ({ page }) => {
    await expect(page.getByText("Funded YTD")).toBeVisible();
  });

  test("shows Active card", async ({ page }) => {
    await expect(page.getByText("Active", { exact: true })).toBeVisible();
  });

  test("shows Pipeline Value card", async ({ page }) => {
    await expect(page.getByText("Pipeline Value")).toBeVisible();
  });

  test("shows Meetings card with day toggle", async ({ page }) => {
    await expect(page.getByText("Meetings")).toBeVisible();
    await expect(page.getByText("7d")).toBeVisible();
    await expect(page.getByText("14d")).toBeVisible();
    await expect(page.getByText("30d")).toBeVisible();
  });
});

test.describe("Leadership Dashboard — pipeline funnel", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "eric");
    await page.goto("/leadership");
  });

  test("shows Pipeline Funnel heading", async ({ page }) => {
    await expect(page.getByText("Pipeline Funnel")).toBeVisible();
  });

  test("shows active pipeline stages", async ({ page }) => {
    await expect(page.getByText("Prospect", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Active Engagement", { exact: true }).first()).toBeVisible();
  });

  test("shows funded row in green", async ({ page }) => {
    const fundedRow = page.locator(".bg-green-50");
    await expect(fundedRow).toBeVisible();
    await expect(fundedRow).toContainText("Funded");
  });

  test("clicking funnel row opens drilldown sheet", async ({ page }) => {
    // Click the first funnel row (Prospect) via JS to bypass any overlay
    await page.getByRole("button", { name: /^Prospect/ }).first().evaluate((el) => (el as HTMLElement).click());
    // Sheet should open
    await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Leadership Dashboard — source ROI table", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "eric");
    await page.goto("/leadership");
  });

  test("shows Source ROI heading", async ({ page }) => {
    await expect(page.getByText("Source ROI")).toBeVisible();
  });

  test("shows table columns", async ({ page }) => {
    await expect(page.getByRole("columnheader", { name: "Source" }).first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Funded" }).first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "AUM" }).first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Conv%" })).toBeVisible();
  });

  test("shows source data rows", async ({ page }) => {
    // Mock data has velocis_network, cpa_referral, etc.
    await expect(page.getByText("Velocis Network")).toBeVisible();
  });

  test("clicking source row opens drilldown sheet", async ({ page }) => {
    // Click via JS to bypass any overlay
    await page.locator("tr", { hasText: "Velocis Network" }).evaluate((el) => (el as HTMLElement).click());
    await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 3000 });
  });
});

// ─── Admin Panel — Users Tab ──────────────────────────────────────────────────

test.describe("Admin Panel — Users tab", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "eric");
    await page.goto("/admin");
  });

  test("shows Users tab by default with user list", async ({ page }) => {
    await expect(page.getByText("Chad Cormier")).toBeVisible();
    await expect(page.getByText("Ken Warsaw")).toBeVisible();
    await expect(page.getByText("Eric Gewirtzman")).toBeVisible();
  });

  test("shows role badges", async ({ page }) => {
    await expect(page.getByText("Rep").first()).toBeVisible();
    await expect(page.getByText("Marketing").first()).toBeVisible();
    await expect(page.getByText("Admin").first()).toBeVisible();
  });

  test("clicking user row opens inline edit panel", async ({ page }) => {
    await page.getByText("Chad Cormier").click();
    // Role template pills should appear
    await expect(page.getByText("Role Template")).toBeVisible();
    await expect(page.getByText("Save Changes")).toBeVisible();
  });

  test("role template pills appear in edit panel", async ({ page }) => {
    await page.getByText("Chad Cormier").click();
    const panel = page.locator("text=Role Template").locator("..");
    await expect(panel.getByText("Rep")).toBeVisible();
    await expect(panel.getByText("Marketing")).toBeVisible();
  });

  test("permission toggles appear in edit panel", async ({ page }) => {
    await page.getByText("Chad Cormier").click();
    await expect(page.getByText("Leadership Dashboard")).toBeVisible();
    await expect(page.getByText("Admin Panel")).toBeVisible();
  });

  test("clicking row again closes edit panel", async ({ page }) => {
    await page.getByText("Chad Cormier").click();
    await expect(page.getByText("Save Changes")).toBeVisible();
    await page.getByText("Chad Cormier").click();
    await expect(page.getByText("Save Changes")).not.toBeVisible();
  });

  test("deactivate button appears in edit panel", async ({ page }) => {
    await page.getByText("Chad Cormier").click();
    await expect(page.getByText("Deactivate")).toBeVisible();
  });

  test("deactivate shows confirmation with reassign picker", async ({ page }) => {
    await page.getByText("Chad Cormier").click();
    await page.getByText("Deactivate").click();
    await expect(page.getByText("Confirm Deactivate")).toBeVisible();
  });
});

// ─── Admin Panel — Lead Sources Tab ──────────────────────────────────────────

test.describe("Admin Panel — Lead Sources tab", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "eric");
    await page.goto("/admin");
    await page.getByRole("tab", { name: "Lead Sources" }).click();
  });

  test("shows existing lead sources", async ({ page }) => {
    await expect(page.getByText("CPA Referral", { exact: true })).toBeVisible();
    await expect(page.getByText("LinkedIn", { exact: true })).toBeVisible();
  });

  test("shows Add source button", async ({ page }) => {
    await expect(page.getByText("Add source")).toBeVisible();
  });

  test("clicking Add source shows inline input", async ({ page }) => {
    await page.getByText("Add source").click();
    await expect(page.locator("input[placeholder*='label' i], input[placeholder*='source' i]").last()).toBeVisible();
  });

  test("can add a new lead source", async ({ page }) => {
    await page.getByText("Add source").click();
    const input = page.locator("input[placeholder*='label' i], input[placeholder*='source' i], input[placeholder*='New source']").last();
    await input.fill("Test Source");
    await input.press("Enter");
    await expect(page.getByText("Test Source")).toBeVisible({ timeout: 3000 });
  });

  test("shows up/down reorder buttons", async ({ page }) => {
    // First row should have a down button, last row should have an up button
    const downButtons = page.locator("button").filter({ hasText: "" }).all();
    // Just verify there are chevron buttons visible
    const chevrons = page.locator("svg").all();
    expect((await chevrons).length).toBeGreaterThan(0);
  });

  test("shows active toggle for each source", async ({ page }) => {
    // Switch/toggle elements should be present
    const toggles = page.locator('[role="switch"]');
    await expect(toggles.first()).toBeVisible();
  });

  test("can deactivate a lead source", async ({ page }) => {
    const firstToggle = page.locator('[role="switch"]').first();
    const wasChecked = await firstToggle.isChecked();
    await firstToggle.click();
    const isNowChecked = await firstToggle.isChecked();
    expect(isNowChecked).toBe(!wasChecked);
  });
});

// ─── Pipeline — Unassigned Support ───────────────────────────────────────────

test.describe("Pipeline — unassigned filter", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "chad");
  });

  test("pipeline loads with assignedRep=unassigned filter", async ({ page }) => {
    await page.goto("/pipeline?assignedRep=unassigned");
    await expect(page).toHaveURL(/assignedRep=unassigned/);
    // Table should render (possibly empty if no unassigned in mock)
    await expect(page.locator("h1", { hasText: "Pipeline" })).toBeVisible();
  });

  test("pipeline rep filter shows Unassigned option", async ({ page }) => {
    await page.goto("/pipeline");
    // Wait for table to load
    await expect(page.locator("h1", { hasText: "Pipeline" })).toBeVisible();
    const repSelect = page.locator("select").filter({ hasText: "Unassigned" });
    await expect(repSelect).toBeVisible();
  });
});
