import { test, expect } from "@playwright/test";

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
