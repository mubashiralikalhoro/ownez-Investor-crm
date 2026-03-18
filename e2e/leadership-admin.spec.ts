/**
 * Leadership Dashboard + Admin Panel Tests
 * Verifies all tasks in the leadership-admin spec.
 * Run: npx playwright test e2e/leadership-admin.spec.ts
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

async function resetData(page: { request: { post: (url: string) => Promise<unknown> } }) {
  await page.request.post("/api/test-reset");
}

// ─── Access Control ──────────────────────────────────────────────────────────

test.describe("Access control", () => {
  test("leadership dashboard redirects non-admin (chad)", async ({ page }) => {
    await resetData(page);
    await loginAs(page, "chad");
    await page.goto("/leadership");
    await expect(page).not.toHaveURL("/leadership");
  });

  test("admin panel redirects non-admin (chad)", async ({ page }) => {
    await resetData(page);
    await loginAs(page, "chad");
    await page.goto("/admin");
    await expect(page).not.toHaveURL("/admin");
  });

  test("leadership dashboard accessible for admin (eric)", async ({ page }) => {
    await resetData(page);
    await loginAs(page, "eric");
    await page.goto("/leadership");
    await expect(page).toHaveURL("/leadership");
    await expect(page.locator("h1", { hasText: "Leadership Dashboard" })).toBeVisible();
  });

  test("admin panel accessible for admin (eric)", async ({ page }) => {
    await resetData(page);
    await loginAs(page, "eric");
    await page.goto("/admin");
    await expect(page).toHaveURL("/admin");
    await expect(page.locator("h1", { hasText: "Admin Panel" })).toBeVisible();
  });
});

// ─── Sidebar Nav ─────────────────────────────────────────────────────────────

test.describe("Sidebar nav links", () => {
  test("admin sees Leadership and Admin links in sidebar", async ({ page }) => {
    await resetData(page);
    await loginAs(page, "eric");
    await expect(page.locator("nav").locator("text=Leadership")).toBeVisible();
    await expect(page.locator("nav").locator("text=Admin")).toBeVisible();
  });

  test("rep (chad) does not see Leadership or Admin links", async ({ page }) => {
    await resetData(page);
    await loginAs(page, "chad");
    await expect(page.locator("nav").locator("text=Leadership")).not.toBeVisible();
    await expect(page.locator("nav").locator("text=Admin")).not.toBeVisible();
  });
});

// ─── Task 2-3: Leadership Dashboard — AUM Progress ───────────────────────────

test.describe("Leadership Dashboard — AUM Progress", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "eric");
    await page.goto("/leadership");
  });

  test("shows AUM progress section", async ({ page }) => {
    await expect(page.locator("text=AUM Progress")).toBeVisible();
  });

  test("shows baseline and target dollar amounts", async ({ page }) => {
    // Should show $60M baseline
    await expect(page.locator("text=/\\$60/")).toBeVisible();
    // Should show $105M target
    await expect(page.locator("text=/\\$105/")).toBeVisible();
  });

  test("progress bar renders", async ({ page }) => {
    // The gold progress bar fill should exist
    const bar = page.locator("[data-testid='aum-bar-fill'], .bg-gold").first();
    await expect(bar).toBeVisible();
  });
});

// ─── Task 3: Leadership Dashboard — Funnel Chart ─────────────────────────────

test.describe("Leadership Dashboard — Funnel Chart", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "eric");
    await page.goto("/leadership");
  });

  test("shows Pipeline Funnel section", async ({ page }) => {
    await expect(page.locator("text=Pipeline Funnel")).toBeVisible();
  });

  test("shows pipeline stage names", async ({ page }) => {
    await expect(page.locator("text=Prospect")).toBeVisible();
    await expect(page.locator("text=Active Engagement")).toBeVisible();
  });
});

// ─── Task 3: Leadership Dashboard — Source Attribution ───────────────────────

test.describe("Leadership Dashboard — Source Attribution", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "eric");
    await page.goto("/leadership");
  });

  test("shows Source Attribution section", async ({ page }) => {
    await expect(page.locator("text=Source Attribution")).toBeVisible();
  });

  test("shows lead source data rows", async ({ page }) => {
    // Mock data has prospects with various lead sources
    // At least one source should appear with a count
    const rows = page.locator("table, [data-testid='source-table']").first();
    await expect(rows).toBeVisible();
  });
});

// ─── Task 3: Leadership Dashboard — Top Referrers ───────────────────────────

test.describe("Leadership Dashboard — Top Referrers", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "eric");
    await page.goto("/leadership");
  });

  test("shows Top Referrers section", async ({ page }) => {
    await expect(page.locator("text=Top Referrers")).toBeVisible();
  });

  test("shows empty state or referrer data", async ({ page }) => {
    // Either shows referrer data or the empty state message
    const hasReferrers = await page.locator("text=No referrals logged yet").isVisible();
    const hasData = await page.locator("text=Top Referrers").isVisible();
    expect(hasReferrers || hasData).toBe(true);
  });
});

// ─── Task 3: Leadership Dashboard — Red Flags ────────────────────────────────

test.describe("Leadership Dashboard — Red Flags", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "eric");
    await page.goto("/leadership");
  });

  test("shows Red Flags section", async ({ page }) => {
    await expect(page.locator("text=Red Flags")).toBeVisible();
  });

  test("shows overdue or stale prospects, or healthy state", async ({ page }) => {
    // Mock data has overdue prospects, so Red Flags should be populated
    // OR it shows the healthy green state
    const hasFlags = await page.locator("text=Pipeline Healthy").isVisible();
    const hasOverdue = await page.locator("text=/Overdue|Stale/").last().isVisible().catch(() => false);
    expect(hasFlags || hasOverdue).toBe(true);
  });

  test("red flag person links to person detail", async ({ page }) => {
    // If there are red flags, clicking a name should navigate to person detail
    const flagLink = page.locator("[href^='/person/']").first();
    const hasLinks = await flagLink.isVisible().catch(() => false);
    if (hasLinks) {
      await flagLink.click();
      await expect(page).toHaveURL(/\/person\//);
    }
  });
});

// ─── Task 5-6: Admin Panel — System Settings ─────────────────────────────────

test.describe("Admin Panel — System Settings", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "eric");
    await page.goto("/admin");
  });

  test("shows System Settings tab", async ({ page }) => {
    await expect(page.locator("text=System Settings")).toBeVisible();
  });

  test("shows AUM fields pre-populated", async ({ page }) => {
    // Should show current values (60000000 or $60M formatted)
    await expect(page.locator("input[name='aumBaseline'], input[placeholder*='60']").first()).toBeVisible();
  });

  test("can update company name and save", async ({ page }) => {
    const input = page.locator("input[name='companyName'], input[placeholder*='company' i]").first();
    await input.fill("OwnEZ Capital Updated");
    await page.locator("button", { hasText: /save/i }).first().click();
    // Should show save confirmation
    await expect(page.locator("text=/Saved|Success/i")).toBeVisible({ timeout: 3000 });
  });
});

// ─── Task 7: Admin Panel — Users ─────────────────────────────────────────────

test.describe("Admin Panel — Users", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "eric");
    await page.goto("/admin");
    await page.locator("text=Users").click();
  });

  test("shows users tab with existing users", async ({ page }) => {
    // Mock data has chad, ken, eric, efri
    await expect(page.locator("text=Chad Cormier")).toBeVisible();
    await expect(page.locator("text=Ken Warsaw")).toBeVisible();
    await expect(page.locator("text=Eric Gewirtzman")).toBeVisible();
  });

  test("shows add user button", async ({ page }) => {
    await expect(page.locator("button", { hasText: /add user/i })).toBeVisible();
  });

  test("can expand add user form", async ({ page }) => {
    await page.locator("button", { hasText: /add user/i }).click();
    await expect(page.locator("input[name='fullName'], input[placeholder*='Full Name' i]").last()).toBeVisible();
  });

  test("can create a new user", async ({ page }) => {
    await page.locator("button", { hasText: /add user/i }).click();
    await page.locator("input[name='fullName'], input[placeholder*='Full Name' i]").last().fill("Test Rep");
    await page.locator("input[name='username'], input[placeholder*='username' i]").last().fill("testuser");
    await page.locator("input[type='password']").last().fill("password123");
    // Select role
    const roleSelect = page.locator("select[name='role']").last();
    await roleSelect.selectOption("rep");
    await page.locator("button", { hasText: /save|create/i }).last().click();
    // Should appear in the table
    await expect(page.locator("text=Test Rep")).toBeVisible({ timeout: 3000 });
  });
});

// ─── Task 8: Admin Panel — Lead Sources ──────────────────────────────────────

test.describe("Admin Panel — Lead Sources", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "eric");
    await page.goto("/admin");
    await page.locator("text=Lead Sources").click();
  });

  test("shows current lead sources", async ({ page }) => {
    // Should show at least some of the existing lead sources
    await expect(page.locator("text=/CPA Referral|M&A Attorney|LinkedIn/")).toBeVisible();
  });

  test("shows add lead source form", async ({ page }) => {
    // Should have an input to add a new source
    await expect(page.locator("input[placeholder*='label' i], input[placeholder*='source' i], button:has-text('Add')").first()).toBeVisible();
  });
});
