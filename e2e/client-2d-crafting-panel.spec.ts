/**
 * CLIENT 2D CRAFTING PANEL E2E TESTS
 *
 * End-to-end tests for the 2D client crafting panel.
 * Tests that the crafting window opens and displays recipes.
 */

import { test, expect } from "@playwright/test";

test.describe("2D Client Crafting Panel", () => {
  test("shows crafting panel when pressing B key", async ({ page }) => {
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
    });

    // Wait for the app to initialize
    await page.waitForTimeout(2000);

    // Press B to open crafting
    await page.keyboard.press("b");

    // Wait for the crafting window to appear
    await page.waitForSelector('[role="dialog"][aria-label="Crafting"]', {
      timeout: 5000,
    });

    // Verify the crafting window is visible
    const craftingWindow = page.locator('[role="dialog"][aria-label="Crafting"]');
    await expect(craftingWindow).toBeVisible();

    // Verify the title is present
    await expect(page.locator('text=CRAFTING')).toBeVisible();

    // Verify all three recipes are displayed
    await expect(page.locator('text=Craft Wood Plank')).toBeVisible();
    await expect(page.locator('text=Smelt Copper Ingot')).toBeVisible();
    await expect(page.locator('text=Cook Raw Fish')).toBeVisible();
  });

  test("crafting panel shows recipe details", async ({ page }) => {
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForTimeout(2000);

    // Open crafting
    await page.keyboard.press("b");

    await page.waitForSelector('[role="dialog"][aria-label="Crafting"]', {
      timeout: 5000,
    });

    // Check for Wood Plank recipe details
    await expect(page.locator('text=Requires Crafting Lv. 1').first()).toBeVisible();
    await expect(page.locator('text=+20 XP').first()).toBeVisible();

    // Check for input/output information
    await expect(page.locator('text=2× wood_log')).toBeVisible();
    await expect(page.locator('text=1× wood_plank').first()).toBeVisible();
  });

  test("crafting panel closes with Escape key", async ({ page }) => {
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForTimeout(2000);

    // Open crafting
    await page.keyboard.press("b");

    await page.waitForSelector('[role="dialog"][aria-label="Crafting"]', {
      timeout: 5000,
    });

    // Close crafting with Escape
    await page.keyboard.press("Escape");

    // Verify the crafting window is no longer visible
    await expect(
      page.locator('[role="dialog"][aria-label="Crafting"]')
    ).not.toBeVisible({ timeout: 3000 });
  });

  test("toggle crafting with B key", async ({ page }) => {
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForTimeout(2000);

    // First press - opens crafting
    await page.keyboard.press("b");
    await page.waitForSelector('[role="dialog"][aria-label="Crafting"]', {
      timeout: 5000,
    });
    await expect(page.locator('[role="dialog"][aria-label="Crafting"]')).toBeVisible();

    // Second press - closes crafting
    await page.keyboard.press("b");
    await expect(
      page.locator('[role="dialog"][aria-label="Crafting"]')
    ).not.toBeVisible({ timeout: 3000 });
  });
});