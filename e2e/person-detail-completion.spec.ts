/**
 * Person Detail Completion Tests
 * Verifies the 7 missing features added in the person-detail-completion plan.
 * Run: npx playwright test e2e/person-detail-completion.spec.ts
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

async function resetData(page: { request: { post: (url: string) => Promise<unknown> } }) {
  await page.request.post("/api/test-reset");
}

// ─── Task 1: Related Contacts — Add & Remove ───────────────────────────────

test.describe("Task 1: Related Contacts — add & remove", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "chad");
    await page.goto("/person/p-robert");
    // Open Relationships section (may be collapsed)
    const relationships = page.locator("h3", { hasText: "Relationships" });
    const isExpanded = await page.locator("text=Related Contacts").isVisible().catch(() => false);
    if (!isExpanded) await relationships.click();
  });

  test("shows Add Contact button", async ({ page }) => {
    await expect(page.locator("button", { hasText: "Add Contact" })).toBeVisible();
  });

  test("add contact — search, select, enter role, confirm", async ({ page }) => {
    await page.locator("button", { hasText: "Add Contact" }).click();

    // Type in search input
    const searchInput = page.locator("input[placeholder*='Search people']").last();
    await searchInput.fill("Marcus");

    // Wait for dropdown result
    await expect(page.locator("text=Marcus Johnson").last()).toBeVisible({ timeout: 5000 });
    await page.locator("text=Marcus Johnson").last().click();

    // Enter role
    const roleInput = page.locator("input[placeholder*='Role']").last();
    await roleInput.fill("Business partner");

    // Confirm
    await page.locator("button", { hasText: "Add" }).last().click();

    // Marcus Johnson should now appear in related contacts
    await expect(page.locator("text=Marcus Johnson").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Business partner").first()).toBeVisible();
  });

  test("remove contact — click × and contact disappears", async ({ page }) => {
    // Mrs. Calloway is pre-linked to p-robert
    await expect(page.locator("text=Mrs. Calloway").first()).toBeVisible();

    // Find and click the remove button for Mrs. Calloway's row
    const callowaRow = page.locator("div", { hasText: "Mrs. Calloway" }).first();
    await callowaRow.locator("button[aria-label*='remove'], button[title*='remove'], button:has-text('×')").click();

    // Mrs. Calloway should be gone
    await expect(page.locator("text=Mrs. Calloway")).not.toBeVisible({ timeout: 5000 });
  });
});

// ─── Task 2: Collaborators Field ─────────────────────────────────────────

test.describe("Task 2: Collaborators field", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "chad");
  });

  test("shows Collaborators label in prospect fields", async ({ page }) => {
    await page.goto("/person/p-robert");
    await expect(page.locator("text=Collaborators")).toBeVisible();
  });

  test("p-huang shows Ken Warsaw as existing collaborator", async ({ page }) => {
    // p-huang already has u-ken as collaborator in mock data
    await page.goto("/person/p-huang");
    await expect(page.locator("text=Ken Warsaw")).toBeVisible();
  });

  test("add collaborator — select from dropdown", async ({ page }) => {
    // p-robert has no collaborators — add Ken
    await page.goto("/person/p-robert");

    // Find the collaborator add select/button
    const addSelect = page.locator("select[aria-label*='collaborator'], select").filter({ has: page.locator("option", { hasText: "Ken Warsaw" }) }).first();
    await addSelect.selectOption({ label: "Ken Warsaw" });

    // Ken Warsaw should now appear as collaborator
    await expect(page.locator("text=Ken Warsaw")).toBeVisible({ timeout: 5000 });
  });

  test("remove collaborator — click × next to name", async ({ page }) => {
    // p-huang already has Ken as collaborator
    await page.goto("/person/p-huang");
    await expect(page.locator("text=Ken Warsaw")).toBeVisible();

    // Remove Ken
    const kenRow = page.locator("span, div", { hasText: "Ken Warsaw" }).first();
    await kenRow.locator("button").first().click();

    // Ken should be gone from collaborators
    // (He may still appear elsewhere in the page — check collaborators section specifically)
    await page.waitForLoadState("networkidle");
    const collaboratorsSection = page.locator("text=Collaborators").first();
    await expect(collaboratorsSection).toBeVisible();
    // After removal, Ken should not be listed as collaborator anymore
    const collaboratorNames = page.locator("[data-testid='collaborator-list']");
    // If no data-testid, just verify the page refreshed and the collaborator count changed
    await expect(page.locator("text=Ken Warsaw")).not.toBeVisible({ timeout: 5000 });
  });
});

// ─── Task 3: Reassignment Auto-Log ────────────────────────────────────────

test.describe("Task 3: Reassignment auto-log", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "eric"); // admin
  });

  test("reassigning rep creates reassignment activity in timeline", async ({ page }) => {
    // p-grant is assigned to chad — change to eric
    await page.goto("/person/p-grant");

    // Admin sees an editable select for Assigned Rep
    const repSelect = page.locator("select").filter({ has: page.locator("option", { hasText: "Chad Cormier" }) }).first();
    await repSelect.selectOption({ label: "Eric Gewirtzman" });

    // Wait for refresh
    await page.waitForLoadState("networkidle");

    // Timeline should show a reassignment activity
    await expect(page.locator("text=/Reassigned from Chad/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("non-admin cannot see rep select (sees plain text)", async ({ page }) => {
    await loginAs(page, "chad");
    await page.goto("/person/p-grant");
    // Rep field shows text, not a select
    await expect(page.locator("text=Chad Cormier")).toBeVisible();
    // No select with rep options visible
    const repSelect = page.locator("select").filter({ has: page.locator("option", { hasText: "Eric Gewirtzman" }) });
    await expect(repSelect).not.toBeVisible();
  });
});

// ─── Task 4: Nurture Stage — Re-engage Date Required ─────────────────────

test.describe("Task 4: Nurture stage requires re-engage date", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "chad");
    await page.goto("/person/p-robert"); // Active Engagement
  });

  test("clicking Nurture shows re-engage date prompt, not immediate change", async ({ page }) => {
    // Expand stage bar
    await page.click("text=click to change stage");
    await expect(page.locator("button", { hasText: "Nurture" })).toBeVisible();

    // Click Nurture
    await page.locator("button", { hasText: "Nurture" }).click();

    // Should show re-engage date form, NOT have changed stage yet
    await expect(page.locator("text=/Re-engage Date/i")).toBeVisible();
    await expect(page.locator("button", { hasText: /Move to Nurture/i })).toBeVisible();
  });

  test("canceling Nurture prompt keeps original stage", async ({ page }) => {
    await page.click("text=click to change stage");
    await page.locator("button", { hasText: "Nurture" }).click();

    // Cancel
    await page.locator("button", { hasText: "Cancel" }).click();

    // Stage should still be Active Engagement (dot progression still visible)
    await expect(page.locator("text=click to change stage")).toBeVisible();
    // Stage badge still shows Active Engagement
    await expect(page.locator("[data-slot='badge']", { hasText: "Active Engagement" })).toBeVisible();
  });

  test("confirming Nurture with date changes stage to Nurture", async ({ page }) => {
    await page.click("text=click to change stage");
    await page.locator("button", { hasText: "Nurture" }).click();

    // Date input should have a default value — just confirm as-is or set one
    const dateInput = page.locator("input[type='date']").last();
    await dateInput.fill("2026-05-01");

    await page.locator("button", { hasText: /Move to Nurture/i }).click();

    // Stage should now be Nurture
    await page.waitForLoadState("networkidle");
    await expect(page.locator("[data-slot='badge']", { hasText: "Nurture" })).toBeVisible({ timeout: 5000 });
  });
});

// ─── Task 5: Dead Stage — Lost Reason Required ───────────────────────────

test.describe("Task 5: Dead stage requires lost reason", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "chad");
    await page.goto("/person/p-marcus"); // Active Engagement, clean slate
  });

  test("clicking Dead shows lost reason prompt, not immediate change", async ({ page }) => {
    await page.click("text=click to change stage");
    await expect(page.locator("button", { hasText: "Dead" })).toBeVisible();

    await page.locator("button", { hasText: "Dead" }).click();

    // Should show lost reason form
    await expect(page.locator("text=/Lost Reason/i")).toBeVisible();
    await expect(page.locator("button", { hasText: /Mark as Dead/i })).toBeVisible();
  });

  test("Mark as Dead button disabled until reason selected", async ({ page }) => {
    await page.click("text=click to change stage");
    await page.locator("button", { hasText: "Dead" }).click();

    const markDeadBtn = page.locator("button", { hasText: /Mark as Dead/i });
    await expect(markDeadBtn).toBeDisabled();
  });

  test("confirming Dead with reason changes stage", async ({ page }) => {
    await page.click("text=click to change stage");
    await page.locator("button", { hasText: "Dead" }).click();

    // Select a reason
    await page.locator("select").last().selectOption({ label: "Not Interested" });

    await page.locator("button", { hasText: /Mark as Dead/i }).click();

    await page.waitForLoadState("networkidle");
    await expect(page.locator("[data-slot='badge']", { hasText: "Dead" })).toBeVisible({ timeout: 5000 });
  });
});

// ─── Task 6: Post-Stage-Change Inline Prompt ─────────────────────────────

test.describe("Task 6: Post-stage-change inline next action prompt", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "chad");
    await page.goto("/person/p-robert"); // Active Engagement
  });

  test("after stage change, next action prompt appears inline", async ({ page }) => {
    await page.click("text=click to change stage");

    // Move back one step — click Pitch (step 4)
    await page.locator("button", { hasText: "Pitch" }).click();

    // Confirm the browser confirm dialog
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });

    // Post-change prompt should appear
    await expect(page.locator("text=/Update your plan/i")).toBeVisible({ timeout: 5000 });
  });

  test("skip button on post-change prompt refreshes without updating next action", async ({ page }) => {
    await page.click("text=click to change stage");
    page.once("dialog", async (dialog) => await dialog.accept());
    await page.locator("button", { hasText: "Pitch" }).click();

    await expect(page.locator("text=/Update your plan/i")).toBeVisible({ timeout: 5000 });

    // Click Skip
    await page.locator("button, a", { hasText: /Skip/i }).click();

    // Page should reload — stage badge updates
    await page.waitForLoadState("networkidle");
    await expect(page.locator("[data-slot='badge']", { hasText: "Pitch" })).toBeVisible({ timeout: 5000 });
  });

  test("confirm button on prompt saves next action and refreshes", async ({ page }) => {
    await page.click("text=click to change stage");
    page.once("dialog", async (dialog) => await dialog.accept());
    await page.locator("button", { hasText: "Pitch" }).click();

    await expect(page.locator("text=/Update your plan/i")).toBeVisible({ timeout: 5000 });

    // Type a new detail
    const detailInput = page.locator("input[type='text']").last();
    await detailInput.fill("Follow up on pitch deck");

    await page.locator("button", { hasText: /Confirm/i }).last().click();

    await page.waitForLoadState("networkidle");
    // New next action detail should appear on page
    await expect(page.locator("text=Follow up on pitch deck")).toBeVisible({ timeout: 5000 });
  });
});

// ─── Task 7: Funded Transition Flow ──────────────────────────────────────
// Always creates a new entity — no "select existing" path.

test.describe("Task 7: Funded transition — always create new entity", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await loginAs(page, "chad");
    await page.goto("/person/p-marcus"); // Active Engagement, no pre-existing entities
  });

  test("clicking Funded shows entity + investment creation form", async ({ page }) => {
    await page.click("text=click to change stage");
    await page.locator("button", { hasText: "Funded" }).click();

    // Always shows entity creation fields (never a dropdown of existing entities)
    await expect(page.locator("input[placeholder*='Entity Name']").first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator("select").filter({ has: page.locator("option", { hasText: "LLC" }) })).toBeVisible();
    await expect(page.locator("button", { hasText: /Complete Funding/i })).toBeVisible();
  });

  test("Complete Funding button disabled until required fields filled", async ({ page }) => {
    await page.click("text=click to change stage");
    await page.locator("button", { hasText: "Funded" }).click();

    const completeBtn = page.locator("button", { hasText: /Complete Funding/i });
    await expect(completeBtn).toBeDisabled();

    // Fill entity name only — still disabled (entity type + amount also required)
    await page.locator("input[placeholder*='Entity Name']").first().fill("Johnson Capital LLC");
    await expect(completeBtn).toBeDisabled();
  });

  test("Growth Target field only appears when Track = Grow", async ({ page }) => {
    await page.click("text=click to change stage");
    await page.locator("button", { hasText: "Funded" }).click();

    // Growth Target hidden by default (Maintain)
    await expect(page.locator("input[placeholder*='Growth Target'], label", { hasText: /Growth Target/i })).not.toBeVisible();

    // Select Grow
    await page.locator("select").filter({ has: page.locator("option", { hasText: "Grow" }) }).first().selectOption("grow");

    // Growth Target now visible
    await expect(page.locator("text=/Growth Target/i").first()).toBeVisible();
  });

  test("completing funded flow creates entity, investment, and changes stage to Funded", async ({ page }) => {
    await page.click("text=click to change stage");
    await page.locator("button", { hasText: "Funded" }).click();

    // Fill entity fields
    await page.locator("input[placeholder*='Entity Name']").first().fill("Johnson Capital LLC");
    await page.locator("select").filter({ has: page.locator("option", { hasText: "LLC" }) }).first().selectOption("llc");

    // Fill investment fields
    await page.locator("input[type='number']").first().fill("300000");
    await page.locator("input[type='date']").last().fill("2026-03-18");
    // Track defaults to Maintain — leave as-is

    await page.locator("button", { hasText: /Complete Funding/i }).click();

    await page.waitForLoadState("networkidle");
    await expect(page.locator("[data-slot='badge']", { hasText: "Funded" })).toBeVisible({ timeout: 5000 });
  });

  test("cancel button closes the form without changing stage", async ({ page }) => {
    await page.click("text=click to change stage");
    await page.locator("button", { hasText: "Funded" }).click();
    await expect(page.locator("input[placeholder*='Entity Name']").first()).toBeVisible();

    await page.locator("button", { hasText: "Cancel" }).click();

    // Stage unchanged
    await expect(page.locator("[data-slot='badge']", { hasText: "Active Engagement" })).toBeVisible();
  });

  test("funded flow works even when prospect already has entities (p-torres)", async ({ page }) => {
    // p-torres already has Torres Family Trust — flow should still show create form, not a dropdown
    await page.goto("/person/p-torres");
    await page.click("text=click to change stage");
    await page.locator("button", { hasText: "Funded" }).click();

    // Should show create form, NOT a dropdown of existing entities
    await expect(page.locator("input[placeholder*='Entity Name']").first()).toBeVisible({ timeout: 3000 });
    // No entity selection dropdown (no <select> that lists "Torres Family Trust")
    await expect(page.locator("option", { hasText: "Torres Family Trust" })).not.toBeVisible();
  });
});
