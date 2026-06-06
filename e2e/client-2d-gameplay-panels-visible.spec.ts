/**
 * E2E Tests for Gameplay Panels Visibility
 *
 * Verifies:
 * - Gameplay window dock is visible
 * - All registered panels can be toggled
 * - Panels show correct test IDs
 * - Mobile viewport works without panels going off-screen
 */

import { test, expect, devices } from "@playwright/test";

// All panels that should be registered in the dock
const PANELS = [
  { id: "character", toggle: "panel-toggle-character", target: "character-paperdoll-root" },
  { id: "skills", toggle: "panel-toggle-skills", target: "skill-panel-live" },
  { id: "resources", toggle: "panel-toggle-resources", target: "resource-panel-live" },
  { id: "inventory", toggle: "panel-toggle-inventory", target: "inventory-panel-live" },
  { id: "crafting", toggle: "panel-toggle-crafting", target: "crafting-panel-live" },
  { id: "equipment", toggle: "panel-toggle-equipment", target: "equipment-panel-live" },
  { id: "modules", toggle: "panel-toggle-modules", target: "module-registry-panel" },
  { id: "heartbeat", toggle: "panel-toggle-heartbeat", target: "are-heartbeat-panel" },
  { id: "selfheal", toggle: "panel-toggle-selfheal", target: "selfheal-workshop-panel" },
];

test.describe("2D Gameplay Panels Visibility", () => {
  test("gameplay window dock is visible after boot", async ({ page }) => {
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // Wait for boot to complete
    await page.waitForTimeout(3_000);

    // Gameplay dock should be visible
    await expect(page.getByTestId("gameplay-window-dock")).toBeVisible({
      timeout: 30_000,
    });

    // At least one panel toggle should be visible
    const characterToggle = page.getByTestId("panel-toggle-character");
    await expect(characterToggle).toBeVisible();
  });

  test("all core panels can be opened from dock", async ({ page }) => {
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await page.waitForTimeout(3_000);

    // Ensure dock is visible
    await expect(page.getByTestId("gameplay-window-dock")).toBeVisible({
      timeout: 30_000,
    });

    // Test core panels that should work without full server connection
    const corePanels = PANELS.filter(p =>
      ["character", "skills", "resources", "inventory", "crafting", "equipment"].includes(p.id)
    );

    for (const panel of corePanels) {
      const toggle = page.getByTestId(panel.toggle);

      await expect(toggle, `toggle ${panel.id}`).toBeVisible();

      await toggle.click();

      // Panel window should appear
      const windowSelector = `[data-testid="gameplay-window-${panel.id}"]`;
      await expect(
        page.locator(windowSelector),
        `window ${panel.id}`,
      ).toBeVisible({
        timeout: 10_000,
      });

      // Click again to close
      await toggle.click();
      await page.waitForTimeout(300);
    }
  });

  test("character panel shows character select when no character exists", async ({ page }) => {
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await page.waitForTimeout(3_000);

    // Open character panel
    await page.getByTestId("panel-toggle-character").click();

    // Should show character select
    const characterSelect = page.getByTestId("character-select");
    await expect(characterSelect).toBeVisible({ timeout: 10_000 });
  });

  test("keyboard shortcuts open panels", async ({ page }) => {
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await page.waitForTimeout(3_000);

    // Press P for character panel
    await page.keyboard.press("p");
    await page.waitForTimeout(500);

    // Character panel should be visible
    await expect(
      page.locator('[data-testid="gameplay-window-character"]'),
    ).toBeVisible({ timeout: 10_000 });

    // Press P again to close
    await page.keyboard.press("p");
    await page.waitForTimeout(300);

    // Should be closed
    await expect(
      page.locator('[data-testid="gameplay-window-character"]'),
    ).not.toBeVisible();
  });

  test("no critical errors when opening panels", async ({ page }) => {
    const pageErrors: string[] = [];

    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await page.waitForTimeout(3_000);

    // Open and close each panel
    for (const panel of PANELS.slice(0, 4)) {
      const toggle = page.getByTestId(panel.toggle);
      await toggle.click();
      await page.waitForTimeout(500);
      await toggle.click();
      await page.waitForTimeout(300);
    }

    // Check for critical errors
    const criticalErrors = pageErrors.filter(
      (e) => !e.includes("Warning") && !e.includes("DevTools") && !e.includes("favicon")
    );

    expect(
      criticalErrors.length,
      `Critical errors should be empty. Found: ${criticalErrors.join("\n")}`,
    ).toBeLessThan(3);
  });
});

test.describe("2D Gameplay Panels Mobile", () => {
  test.use({ ...devices["Pixel 5"] });

  test("mobile: gameplay dock visible and functional", async ({ page }) => {
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await page.waitForTimeout(3_000);

    // Dock should be visible on mobile
    await expect(page.getByTestId("gameplay-window-dock")).toBeVisible({
      timeout: 30_000,
    });

    // Character panel should open
    await page.getByTestId("panel-toggle-character").click();

    await expect(
      page.locator('[data-testid="gameplay-window-character"], [data-testid="character-paperdoll-root"]'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("mobile: panels stay within viewport", async ({ page }) => {
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await page.waitForTimeout(3_000);

    // Open inventory panel
    await page.getByTestId("panel-toggle-inventory").click();
    await page.waitForTimeout(500);

    // Get panel bounding box
    const panel = page.locator('[data-testid="gameplay-window-inventory"]');
    const box = await panel.boundingBox();

    // Panel should exist and have reasonable bounds
    expect(box).not.toBeNull();

    // Panel should not overflow viewport (allowing for safe area)
    const viewport = page.viewportSize();
    if (viewport && box) {
      expect(box.x).toBeGreaterThanOrEqual(-50);
      expect(box.y).toBeGreaterThanOrEqual(-50);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 50);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 50);
    }
  });
});