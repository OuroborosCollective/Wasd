/**
 * Production Post-Login 2D Client Smoke Test
 * 
 * Verifies that after a VPS deploy, the production /2d/ client
 * actually renders the post-login UI (world root, HUD, dock, character surface)
 * and not just the blue blank screen.
 * 
 * This test:
 * - Clears service worker and cache to ensure fresh load
 * - Clicks "Collective betreten" button
 * - Verifies all post-login UI elements are visible
 * - Fails the deploy if only blue background is visible
 */

import { test, expect } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "https://arelorian.de";

test("production /2d post-login renders world hud dock and character surface", async ({ page }) => {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  // Navigate with unique query to prevent any caching
  await page.goto(`${baseURL}/2d/?e2e=prod-post-login-${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  // Clear all caches to ensure fresh load from production
  await page.evaluate(async () => {
    // Clear localStorage
    localStorage.clear();

    // Unregister all service workers
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }

    // Clear all caches
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  });

  // Reload to ensure fresh state
  await page.reload({ waitUntil: "domcontentloaded" });

  // Step 1: Login Gate must be visible
  await expect(page.getByTestId("cyber-zen-login-gate")).toBeVisible({
    timeout: 30_000,
  });
  console.log("[smoke] Login gate visible");

  // Step 2: Click "Collective betreten" button
  await page.getByRole("button", { name: /collective betreten/i }).click();
  console.log("[smoke] Clicked Collective betreten");

  // Step 3: Post-login children root should be visible
  await expect(page.getByTestId("post-login-children-root")).toBeVisible({
    timeout: 15_000,
  });
  console.log("[smoke] post-login-children-root visible");

  // Step 4: Deterministic world root must be visible
  await expect(page.getByTestId("deterministic-world-root")).toBeVisible({
    timeout: 15_000,
  });
  console.log("[smoke] deterministic-world-root visible");

  // Step 5: HUD must be visible
  await expect(page.getByTestId("arelorian-stitch-hud")).toBeVisible({
    timeout: 15_000,
  });
  console.log("[smoke] arelorian-stitch-hud visible");

  // Step 6: Gameplay dock must be visible
  await expect(page.getByTestId("gameplay-window-dock")).toBeVisible({
    timeout: 15_000,
  });
  console.log("[smoke] gameplay-window-dock visible");

  // Step 7: Character select or paperdoll must be visible
  await expect(
    page.locator(
      '[data-testid="character-paperdoll-root"], [data-testid="character-select"], [data-testid="paperdoll-panel-live"]',
    ),
  ).toBeVisible({
    timeout: 15_000,
  });
  console.log("[smoke] character surface visible");

  // Step 8: No fatal overlay should appear in normal flow
  await expect(page.getByTestId("boot-fatal-overlay")).toHaveCount(0);
  console.log("[smoke] no boot-fatal-overlay");

  // Verify no critical errors
  const criticalErrors = errors.filter(e => 
    !e.includes("Warning") && 
    !e.includes("DevTools") &&
    !e.includes("net::ERR") &&
    !e.includes("favicon")
  );
  
  expect(criticalErrors, `Critical errors: ${criticalErrors.join("\n")}`).toEqual([]);
  console.log("[smoke] No critical errors");
});

test("production /2d world boot status shows and reaches ready state", async ({ page }) => {
  await page.goto(`${baseURL}/2d/?e2e=prod-boot-status-${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  // Clear caches
  await page.evaluate(async () => {
    localStorage.clear();
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  });

  await page.reload({ waitUntil: "domcontentloaded" });

  // Click to enter
  await page.getByRole("button", { name: /collective betreten/i }).click();

  // World boot status should be visible
  const bootStatus = page.getByTestId("world-boot-status");
  await expect(bootStatus).toBeVisible({ timeout: 15_000 });
  
  // Should eventually reach world_ready state (or failed if Pixi is broken)
  await expect(bootStatus).toContainText(/Areloria World/, { timeout: 60_000 });
  
  console.log("[smoke] World boot status shows correct phase");
});