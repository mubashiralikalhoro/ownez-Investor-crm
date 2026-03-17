import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Sidebar Navigation", () => {
  test("rep role sees Dashboard, Pipeline, People only", async ({ page }) => {
    await loginAs(page, "chad");
    const sidebar = page.locator("aside");
    await expect(sidebar.locator("text=OwnEZ Capital")).toBeVisible();
    await expect(sidebar.locator("text=Dashboard")).toBeVisible();
    await expect(sidebar.locator("text=Pipeline")).toBeVisible();
    await expect(sidebar.locator("text=People")).toBeVisible();
    await expect(sidebar.locator("text=Leadership")).not.toBeVisible();
    await expect(sidebar.locator("text=Admin")).not.toBeVisible();
    await expect(sidebar.locator("text=Chad Cormier")).toBeVisible();
  });

  test("admin role sees all nav items", async ({ page }) => {
    await loginAs(page, "eric");
    const sidebar = page.locator("aside");
    await expect(sidebar.locator("text=Dashboard")).toBeVisible();
    await expect(sidebar.locator("text=Pipeline")).toBeVisible();
    await expect(sidebar.locator("text=People")).toBeVisible();
    await expect(sidebar.locator("text=Leadership")).toBeVisible();
    await expect(sidebar.locator("text=Admin")).toBeVisible();
  });

  test("marketing role sees Leadership but not Admin", async ({ page }) => {
    await loginAs(page, "ken");
    const sidebar = page.locator("aside");
    await expect(sidebar.locator("text=Dashboard")).toBeVisible();
    await expect(sidebar.locator("text=Pipeline")).toBeVisible();
    await expect(sidebar.locator("text=People")).toBeVisible();
    await expect(sidebar.locator("text=Leadership")).toBeVisible();
    await expect(sidebar.locator("text=Admin")).not.toBeVisible();
  });

  test("active route is highlighted with gold text", async ({ page }) => {
    await loginAs(page, "chad");
    // Dashboard link should have gold class when on /
    const dashboardLink = page.locator("aside a", { hasText: "Dashboard" });
    await expect(dashboardLink).toHaveClass(/text-gold/);
  });

  test("sidebar navigation works", async ({ page }) => {
    await loginAs(page, "chad");
    await page.click("aside >> text=Pipeline");
    await expect(page).toHaveURL(/\/pipeline/);
    await page.click("aside >> text=People");
    await expect(page).toHaveURL(/\/people/);
    await page.click("aside >> text=Dashboard");
    await expect(page).toHaveURL("/");
  });
});
