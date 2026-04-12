import { test, expect } from "@playwright/test";

// Helper: fully onboarded user — skips terminal, goes straight to game UI
async function skipToGameUI(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("battleai_runner", JSON.stringify({ name: "TESTER", createdAt: new Date().toISOString() }));
    localStorage.setItem("battleai_onboarding_done", "1");
    localStorage.setItem("battleai_first_boot", "1");
    localStorage.setItem("battleai_token", crypto.randomUUID());
  });
  await page.reload();
  await expect(page.locator("textarea")).toBeVisible({ timeout: 10000 });
}

test.describe("Leaderboard overlay", () => {
  test("opens from RANKING button in header", async ({ page }) => {
    await skipToGameUI(page);

    await page.locator("button", { hasText: "RANKING" }).click();

    // Overlay should appear with blur backdrop
    await expect(page.locator("text=RUNNER RANKINGS")).toBeVisible({ timeout: 3000 });
  });

  test("shows loading then content", async ({ page }) => {
    await skipToGameUI(page);
    await page.locator("button", { hasText: "RANKING" }).click();

    // Should show table or empty state
    await expect(page.locator("text=RUNNER RANKINGS")).toBeVisible({ timeout: 3000 });
    // Loading should resolve
    await expect(page.locator("text=QUERYING MATRIX")).not.toBeVisible({ timeout: 5000 });
  });

  test("closes with ESC", async ({ page }) => {
    await skipToGameUI(page);
    await page.locator("button", { hasText: "RANKING" }).click();
    await expect(page.locator("text=RUNNER RANKINGS")).toBeVisible({ timeout: 3000 });

    await page.keyboard.press("Escape");

    await expect(page.locator("text=RUNNER RANKINGS")).not.toBeVisible({ timeout: 2000 });
  });

  test("closes with JACK BACK IN button", async ({ page }) => {
    await skipToGameUI(page);
    await page.locator("button", { hasText: "RANKING" }).click();
    await expect(page.locator("text=RUNNER RANKINGS")).toBeVisible({ timeout: 3000 });

    await page.locator("button", { hasText: "JACK BACK IN" }).click();

    await expect(page.locator("text=RUNNER RANKINGS")).not.toBeVisible({ timeout: 2000 });
  });

  test("closes when clicking backdrop", async ({ page }) => {
    await skipToGameUI(page);
    await page.locator("button", { hasText: "RANKING" }).click();
    await expect(page.locator("text=RUNNER RANKINGS")).toBeVisible({ timeout: 3000 });

    // Click on the backdrop area (top-left corner, outside the terminal)
    await page.mouse.click(10, 10);

    await expect(page.locator("text=RUNNER RANKINGS")).not.toBeVisible({ timeout: 2000 });
  });

  test("game UI is still behind the overlay", async ({ page }) => {
    await skipToGameUI(page);
    await page.locator("button", { hasText: "RANKING" }).click();
    await expect(page.locator("text=RUNNER RANKINGS")).toBeVisible({ timeout: 3000 });

    // Textarea should still exist in DOM (behind blur)
    await expect(page.locator("textarea")).toBeAttached();
  });

  test("/leaderboard redirects to home", async ({ page }) => {
    await page.goto("/leaderboard");
    await expect(page).toHaveURL("/", { timeout: 5000 });
  });
});

test.describe("Leaderboard overlay — mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("RANKING button visible on mobile", async ({ page }) => {
    await skipToGameUI(page);
    await expect(page.locator("button", { hasText: "RANKING" })).toBeVisible();
  });

  test("overlay fits mobile screen", async ({ page }) => {
    await skipToGameUI(page);
    await page.locator("button", { hasText: "RANKING" }).click();
    await expect(page.locator("text=RUNNER RANKINGS")).toBeVisible({ timeout: 3000 });

    const terminal = page.locator(".crt-terminal").last();
    const box = await terminal.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(390);
    }
  });
});
