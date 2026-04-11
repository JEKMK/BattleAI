import { test, expect } from "@playwright/test";

// Helper: fully onboarded user — skips terminal, goes straight to game UI
async function skipToGameUI(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("battleai_runner", JSON.stringify({ name: "TESTER", createdAt: new Date().toISOString() }));
    localStorage.setItem("battleai_onboarding_done", "1");
    localStorage.setItem("battleai_first_boot", "1");
  });
  await page.reload();

  // Should go directly to game UI (no terminal)
  await expect(page.locator("textarea")).toBeVisible({ timeout: 10000 });
}

test.describe("Game UI elements", () => {
  test.beforeEach(async ({ page }) => {
    await skipToGameUI(page);
  });

  test("textarea is visible with placeholder", async ({ page }) => {
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute("placeholder", "// Define your construct...");
  });

  test("faction selector shows 3 factions", async ({ page }) => {
    await expect(page.locator("text=Zaibatsu")).toBeVisible();
    // 3 faction buttons in a grid
    const factionGrid = page.locator(".grid-cols-3");
    await expect(factionGrid).toBeVisible();
    const buttons = factionGrid.locator("button");
    await expect(buttons).toHaveCount(3);
  });

  test("JACK IN or TRAIN button is visible", async ({ page }) => {
    await expect(page.locator("button:has-text('JACK IN'), button:has-text('TRAIN')").first()).toBeVisible();
  });

  test("can type in prompt textarea", async ({ page }) => {
    const textarea = page.locator("textarea");
    await textarea.fill("Attack when close. Block when HP is low.");
    await expect(textarea).toHaveValue("Attack when close. Block when HP is low.");
  });

  test("RAM counter shows", async ({ page }) => {
    await expect(page.locator("text=/\\d+\\/.*RAM/")).toBeVisible();
  });

  test("header shows runner name", async ({ page }) => {
    await expect(page.locator("text=TESTER")).toBeVisible();
  });
});

test.describe("Arena", () => {
  test("canvas is visible when game UI loads", async ({ page }) => {
    await skipToGameUI(page);
    await expect(page.locator("canvas")).toBeVisible({ timeout: 5000 });
  });
});
