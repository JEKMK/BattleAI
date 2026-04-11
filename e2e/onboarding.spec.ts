import { test, expect } from "@playwright/test";

test.describe("Fresh user onboarding", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("boot sequence plays and transitions to explain", async ({ page }) => {
    await expect(page.locator("text=LOADING ONO-SENDAI")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=CONNECTED")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=You're a runner now")).toBeVisible({ timeout: 15000 });
  });

  test("can skip boot by clicking", async ({ page }) => {
    // Wait for at least one boot line, then click to skip
    await expect(page.locator("text=LOADING ONO-SENDAI")).toBeVisible({ timeout: 5000 });
    // Click on the terminal area to skip
    await page.locator(".crt-terminal").first().click();
    // Should show explain text quickly
    await expect(page.locator("text=You're a runner now")).toBeVisible({ timeout: 5000 });
  });

  test("choice phase shows W/H options after explain", async ({ page }) => {
    await expect(page.locator("text=I'll write my own")).toBeVisible({ timeout: 20000 });
    await expect(page.locator("text=Help me, SYSOP")).toBeVisible();
  });

  test("pressing W enters write mode and dismisses terminal", async ({ page }) => {
    await expect(page.locator("text=I'll write my own")).toBeVisible({ timeout: 20000 });
    await page.keyboard.press("w");
    await expect(page.locator("text=Don't embarrass me")).toBeVisible({ timeout: 3000 });
    await expect(page.locator("textarea")).toBeVisible({ timeout: 10000 });
  });

  test("pressing H shows helped prompt and confirm", async ({ page }) => {
    await expect(page.locator("text=I'll write my own")).toBeVisible({ timeout: 20000 });
    await page.keyboard.press("h");
    await expect(page.locator("text=keep you alive")).toBeVisible({ timeout: 3000 });
    await expect(page.locator(".crt-terminal >> text=Move toward the enemy")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=(Y/n)")).toBeVisible({ timeout: 10000 });
  });

  test("H then Y auto-fills prompt", async ({ page }) => {
    await expect(page.locator("text=I'll write my own")).toBeVisible({ timeout: 20000 });
    await page.keyboard.press("h");
    await expect(page.locator("text=(Y/n)")).toBeVisible({ timeout: 20000 });
    await page.keyboard.press("Enter");
    await expect(page.locator("textarea")).toHaveValue(/Move toward the enemy/, { timeout: 10000 });
  });

  test("H then N goes to write-own mode", async ({ page }) => {
    await expect(page.locator("text=I'll write my own")).toBeVisible({ timeout: 20000 });
    await page.keyboard.press("h");
    await expect(page.locator("text=(Y/n)")).toBeVisible({ timeout: 20000 });
    await page.keyboard.type("n");
    await page.keyboard.press("Enter");
    await expect(page.locator("textarea")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("textarea")).toHaveValue("");
  });
});

test.describe("Returning user", () => {
  test("sees Jack in prompt with existing name", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      // Has name but NO onboarding_done → triggers showOnboarding with existingName
      localStorage.setItem("battleai_runner", JSON.stringify({ name: "NEUROMANCER", createdAt: new Date().toISOString() }));
    });
    await page.reload();

    // Boot plays, then returning user prompt appears inside terminal
    await expect(page.locator(".crt-terminal >> text=NEUROMANCER")).toBeVisible({ timeout: 25000 });
    await expect(page.locator(".crt-terminal >> text=Jack in?")).toBeVisible({ timeout: 25000 });
  });

  test("pressing Enter jacks in", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("battleai_runner", JSON.stringify({ name: "NEUROMANCER", createdAt: new Date().toISOString() }));
    });
    await page.reload();

    await expect(page.locator(".crt-terminal >> text=Jack in?")).toBeVisible({ timeout: 25000 });
    await page.keyboard.press("Enter");
    await expect(page.locator("textarea")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Onboarded user (skips onboarding)", () => {
  test("goes straight to game UI", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("battleai_runner", JSON.stringify({ name: "VETERAN", createdAt: new Date().toISOString() }));
      localStorage.setItem("battleai_onboarding_done", "1");
      localStorage.setItem("battleai_first_boot", "1");
    });
    await page.reload();

    // Should NOT show SYSOP terminal
    await expect(page.locator("text=SYSOP TERMINAL")).not.toBeVisible({ timeout: 3000 });

    // Should show game UI directly
    await expect(page.locator("textarea")).toBeVisible({ timeout: 10000 });
  });
});
