import { test, expect } from "@playwright/test";

test.describe("Lore page", () => {
  test("loads and shows terminal header", async ({ page }) => {
    await page.goto("/lore");
    await expect(page.getByText("ONO-SENDAI CYBERSPACE VII", { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test("typewriter starts writing lore text", async ({ page }) => {
    await page.goto("/lore");
    await expect(page.locator("text=LOADING NEURAL INTERFACE")).toBeVisible({ timeout: 10000 });
  });

  test("ESC navigates back to home", async ({ page }) => {
    await page.goto("/lore");
    await expect(page.getByText("ONO-SENDAI CYBERSPACE VII", { exact: true })).toBeVisible({ timeout: 5000 });
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL("/", { timeout: 5000 });
  });

  test("SYSOP dialogue appears after system boot lines", async ({ page }) => {
    await page.goto("/lore");
    await expect(page.locator("text=another one jacking in")).toBeVisible({ timeout: 30000 });
  });
});
