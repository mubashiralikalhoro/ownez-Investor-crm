import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Authentication", () => {
  test("redirects unauthenticated users to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=OwnEZ Capital")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    await expect(page.locator('input[id="username"]')).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[id="username"]', "wrong");
    await page.fill('input[id="password"]', "wrong");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=Invalid credentials")).toBeVisible();
  });

  test("successful login redirects to dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[id="username"]', "chad");
    await page.fill('input[id="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("session persists after refresh", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[id="username"]', "chad");
    await page.fill('input[id="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/");
    await page.reload();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("logout clears session and redirects to login", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.fill('input[id="username"]', "chad");
    await page.fill('input[id="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/");

    // Logout — use API directly since dev overlay may block
    await page.evaluate(() => fetch("/api/auth/logout", { method: "POST" }));
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);

    // Verify can't access protected routes
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("protects /pipeline without session", async ({ page }) => {
    await page.goto("/pipeline");
    await expect(page).toHaveURL(/\/login/);
  });

  test("protects /person/some-id without session", async ({ page }) => {
    await page.goto("/person/p-robert");
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── User Menu — Desktop ──────────────────────────────────────────────────────

test.describe("User menu — desktop sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "chad");
  });

  test("shows avatar row button in sidebar footer", async ({ page }) => {
    await expect(
      page.locator("aside").getByRole("button", { name: "Open user menu" })
    ).toBeVisible();
  });

  test("clicking avatar row opens popover with user info and sign out", async ({ page }) => {
    await page.locator("aside").getByRole("button", { name: "Open user menu" }).click();
    const popover = page.locator('[data-slot="popover-content"]');
    await expect(popover.getByText("Chad Cormier")).toBeVisible();
    await expect(popover.getByText("Rep", { exact: true })).toBeVisible();
    await expect(popover.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("sign out from popover redirects to login", async ({ page }) => {
    await page.locator("aside").getByRole("button", { name: "Open user menu" }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── User Menu — Mobile ───────────────────────────────────────────────────────

test.describe("User menu — mobile nav", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAs(page, "chad");
  });

  test("shows user avatar tab in mobile bottom nav", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Open user menu" })
    ).toBeVisible();
  });

  test("tapping user tab opens bottom sheet with user info and sign out", async ({ page }) => {
    await page.getByRole("button", { name: "Open user menu" }).click();
    await expect(page.getByText("Chad Cormier")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("sign out from sheet redirects to login", async ({ page }) => {
    await page.getByRole("button", { name: "Open user menu" }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
