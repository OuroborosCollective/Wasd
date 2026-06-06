/**
 * E2E Tests for Real Post-Login World and HUD Boot Path
 * 
 * Verifies:
 * - Login Gate visible before click
 * - After click: deterministic-world-root visible
 * - arelorian-stitch-hud visible
 * - gameplay-window-dock visible
 * - character-select or paperdoll-panel-live visible
 * - No boot-fatal-overlay in normal flow
 */

import { test, expect, devices } from "@playwright/test";

test.describe("Real Post-Login World Boot Path", () => {
  test("real post-login flow shows world root, hud, dock and character surface", async ({ page }) => {
    const errors: string[] = [];

    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/2d/?e2e=real-post-login", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // Clear any previous session
    await page.evaluate(() => {
      localStorage.removeItem("wasd:2d:entered");
    });

    await page.reload({ waitUntil: "domcontentloaded" });

    // Step 1: Login Gate must be visible
    await expect(page.getByTestId("cyber-zen-login-gate")).toBeVisible({
      timeout: 30_000,
    });

    // Step 2: Click "Collective betreten" button
    await page.getByRole("button", { name: /collective betreten/i }).click();

    // Step 3: Post-login children root should be visible
    await expect(page.getByTestId("post-login-children-root")).toBeVisible({
      timeout: 10_000,
    });

    // Step 4: Deterministic world root must be visible
    await expect(page.getByTestId("deterministic-world-root")).toBeVisible({
      timeout: 10_000,
    });

    // Step 5: HUD must be visible
    await expect(page.getByTestId("arelorian-stitch-hud")).toBeVisible({
      timeout: 10_000,
    });

    // Step 6: Gameplay dock must be visible
    await expect(page.getByTestId("gameplay-window-dock")).toBeVisible({
      timeout: 10_000,
    });

    // Step 7: Character select or paperdoll must be visible
    await expect(
      page.locator(
        '[data-testid="character-paperdoll-root"], [data-testid="character-select"], [data-testid="paperdoll-panel-live"]',
      ),
    ).toBeVisible({
      timeout: 10_000,
    });

    // Step 8: No fatal overlay should appear in normal flow
    await expect(page.getByTestId("boot-fatal-overlay")).toHaveCount(0);

    // Log any errors for debugging (but don't fail on warnings)
    const criticalErrors = errors.filter(e => 
      !e.includes("Warning") && 
      !e.includes("DevTools") &&
      !e.includes("net::ERR")
    );
    
    expect(criticalErrors, `Critical errors: ${criticalErrors.join("\n")}`).toEqual([]);
  });

  test("world boot status shows during initialization", async ({ page }) => {
    await page.goto("/2d/?e2e=boot-status", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // Clear session
    await page.evaluate(() => {
      localStorage.removeItem("wasd:2d:entered");
    });

    await page.reload({ waitUntil: "domcontentloaded" });

    // Click to enter
    await page.getByRole("button", { name: /collective betreten/i }).click();

    // World boot status should be visible
    const bootStatus = page.getByTestId("world-boot-status");
    await expect(bootStatus).toBeVisible({ timeout: 10_000 });

    // Eventually should reach world_ready state
    await expect(bootStatus).toContainText(/Areloria World/, { timeout: 60_000 });
  });

  test("post-login shell markers are set correctly", async ({ page }) => {
    await page.goto("/2d/?e2e=post-login-markers", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // Clear session
    await page.evaluate(() => {
      localStorage.removeItem("wasd:2d:entered");
    });

    await page.reload({ waitUntil: "domcontentloaded" });

    // Before click - should be waiting
    const beforeMarker = await page.evaluate(() => document.body.dataset.postLoginShell);
    expect(beforeMarker).toBe("waiting-for-entry");

    // Click to enter
    await page.getByRole("button", { name: /collective betreten/i }).click();

    // After click - should show entered
    await expect(page).toHaveURL(/.*/, { timeout: 10_000 });

    const afterMarker = await page.evaluate(() => document.body.dataset.postLoginShell);
    expect(afterMarker).toBe("entered-rendering-children");
  });
});

test.describe("Mobile Real Post-Login Flow", () => {
  test.use({ ...devices["Pixel 5"] });

  test("mobile real post-login flow shows dock and character surface", async ({ page }) => {
    await page.goto("/2d/?e2e=real-mobile-post-login", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // Clear session
    await page.evaluate(() => {
      localStorage.removeItem("wasd:2d:entered");
    });

    await page.reload({ waitUntil: "domcontentloaded" });

    // Login gate visible
    await expect(page.getByTestId("cyber-zen-login-gate")).toBeVisible({ timeout: 30_000 });

    // Click to enter
    await page.getByRole("button", { name: /collective betreten/i }).click();

    // World root visible
    await expect(page.getByTestId("deterministic-world-root")).toBeVisible({ timeout: 10_000 });

    // HUD visible
    await expect(page.getByTestId("arelorian-stitch-hud")).toBeVisible({ timeout: 10_000 });

    // Dock visible
    await expect(page.getByTestId("gameplay-window-dock")).toBeVisible({ timeout: 10_000 });

    // No fatal overlay
    await expect(page.getByTestId("boot-fatal-overlay")).toHaveCount(0);
  });
});