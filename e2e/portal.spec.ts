import { test, expect } from "@playwright/test";

test.describe("Portal flow (Vibe Jam webring)", () => {
  test("?portal=true skips onboarding entirely", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());

    // Navigate with portal param
    await page.goto("/?portal=true");

    // Should NOT see SYSOP terminal
    await expect(page.locator("text=SYSOP TERMINAL")).not.toBeVisible({ timeout: 3000 });

    // Should see game UI immediately (textarea)
    await expect(page.locator("textarea")).toBeVisible({ timeout: 10000 });
  });

  test("portal user can start battle without onboarding", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/?portal=true");

    // Game UI should be ready
    await expect(page.locator("textarea")).toBeVisible({ timeout: 10000 });

    // Should see JACK IN button
    await expect(page.locator("text=JACK IN")).toBeVisible({ timeout: 5000 });
  });
});
