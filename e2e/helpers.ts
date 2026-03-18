import { Page } from "@playwright/test";

export async function loginAs(page: Page, username: string = "chad") {
  await page.goto("/login");
  await page.fill('input[id="username"]', username);
  await page.fill('input[id="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("/", { timeout: 10000 });
}

/** Reset mock data to initial state — call before tests that depend on exact counts */
export async function resetMockData(baseURL = "http://localhost:3000") {
  await fetch(`${baseURL}/api/test-reset`, { method: "POST" });
}
