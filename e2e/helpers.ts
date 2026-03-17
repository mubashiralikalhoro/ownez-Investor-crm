import { Page } from "@playwright/test";

export async function loginAs(page: Page, username: string = "chad") {
  await page.goto("/login");
  await page.fill('input[id="username"]', username);
  await page.fill('input[id="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("/", { timeout: 10000 });
}
