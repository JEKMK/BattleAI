import { test, expect } from "@playwright/test";

test.describe("Post-battle terminal", () => {
  // These tests hit real LLM APIs and take 30-60s per battle
  test.setTimeout(120_000);

  test("shows after first battle for unnamed user", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("battleai_onboarding_done", "1");
      localStorage.setItem("battleai_first_boot", "1");
      // No runner name — should trigger post-battle name input
    });
    await page.goto("/?portal=true");

    await expect(page.locator("textarea")).toBeVisible({ timeout: 10000 });

    // Type a prompt and start battle
    await page.locator("textarea").fill("Attack always. Move toward enemy.");

    // Click battle button
    const battleBtn = page.locator("button:has-text('JACK IN'), button:has-text('TRAIN')").first();
    await battleBtn.click();

    // Wait for battle to complete — post-battle terminal should appear
    await expect(page.locator("text=SYSOP DEBRIEF")).toBeVisible({ timeout: 90000 });

    // Should show stats phase
    await expect(page.locator("text=Battle analysis complete")).toBeVisible({ timeout: 10000 });

    // Should eventually show name input
    await expect(page.locator("text=What do they call you")).toBeVisible({ timeout: 30000 });
  });

  test("name input accepts text and submits", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("battleai_onboarding_done", "1");
      localStorage.setItem("battleai_first_boot", "1");
    });
    await page.goto("/?portal=true");

    await expect(page.locator("textarea")).toBeVisible({ timeout: 10000 });
    await page.locator("textarea").fill("Attack always. Move toward enemy.");

    const battleBtn = page.locator("button:has-text('JACK IN'), button:has-text('TRAIN')").first();
    await battleBtn.click();

    // Wait for name input phase
    await expect(page.locator("text=What do they call you")).toBeVisible({ timeout: 90000 });

    // Type name and submit
    const nameInput = page.locator("input[type='text'][maxlength='20']");
    await nameInput.fill("CIPHER");
    await page.keyboard.press("Enter");

    // Name should appear in header
    await expect(page.locator("text=CIPHER")).toBeVisible({ timeout: 10000 });
  });
});
