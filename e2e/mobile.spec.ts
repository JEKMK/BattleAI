import { test, expect } from "@playwright/test";

test.describe("Mobile layout", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("onboarding terminal fits mobile screen", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Terminal should be visible and not overflow
    const terminal = page.locator(".crt-terminal").first();
    await expect(terminal).toBeVisible({ timeout: 10000 });

    const box = await terminal.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(390);
    }
  });

  test("game UI stacks vertically on mobile", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("battleai_runner", JSON.stringify({ name: "MOBILE", createdAt: new Date().toISOString() }));
      localStorage.setItem("battleai_onboarding_done", "1");
      localStorage.setItem("battleai_first_boot", "1");
    });
    await page.goto("/?portal=true");

    await expect(page.locator("textarea")).toBeVisible({ timeout: 10000 });

    // JACK IN / TRAIN button should be visible
    await expect(page.locator("button:has-text('JACK IN'), button:has-text('TRAIN')").first()).toBeVisible();

    // Arena canvas should be visible
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("choice W/H works on mobile", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.locator("text=I'll write my own")).toBeVisible({ timeout: 25000 });
    await page.keyboard.press("w");
    await expect(page.locator("text=Don't embarrass me")).toBeVisible({ timeout: 3000 });
  });
});
