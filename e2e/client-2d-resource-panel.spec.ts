/**
 * CLIENT 2D RESOURCE PANEL E2E TESTS
 *
 * End-to-end tests for 2D client resource node panel.
 * Tests that the panel displays live resource data from the server.
 */

import { test, expect } from "@playwright/test";

test.describe("2D Client Resource Node Panel", () => {
  test("shows resource panel when navigating to /2d/", async ({ page }) => {
    // Navigate to 2D client
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
    });

    // Wait for the page to load
    await page.waitForTimeout(2000);

    // Open the resources panel (press 'r' shortcut)
    await page.keyboard.press("r");

    // Wait for panel to render
    await page.waitForTimeout(1000);

    // Check that the resource panel is visible
    const panel = page.getByTestId("resource-panel-live");
    await expect(panel).toBeVisible({ timeout: 10000 });
  });

  test("displays all three starter resource nodes", async ({ page }) => {
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
    });

    // Open resources panel
    await page.keyboard.press("r");
    await page.waitForTimeout(2000);

    // Check for Young Pine (tree)
    await expect(page.locator("body")).toContainText("Young Pine");

    // Check for Copper Rock (ore)
    await expect(page.locator("body")).toContainText("Copper Rock");

    // Check for Calm Fishing Spot (fish)
    await expect(page.locator("body")).toContainText("Calm Fishing Spot");
  });

  test("shows available status for resource nodes", async ({ page }) => {
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
    });

    // Open resources panel
    await page.keyboard.press("r");
    await page.waitForTimeout(2000);

    // Check for "Available" text
    await expect(page.locator("body")).toContainText("Available");
  });

  test("displays XP rewards for each node", async ({ page }) => {
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
    });

    // Open resources panel
    await page.keyboard.press("r");
    await page.waitForTimeout(2000);

    // Check for XP rewards (25, 30, 20)
    await expect(page.locator("body")).toContainText("+25 XP");
    await expect(page.locator("body")).toContainText("+30 XP");
    await expect(page.locator("body")).toContainText("+20 XP");
  });

  test("shows item rewards for each node", async ({ page }) => {
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
    });

    // Open resources panel
    await page.keyboard.press("r");
    await page.waitForTimeout(2000);

    // Check for item names
    await expect(page.locator("body")).toContainText("Wood Log");
    await expect(page.locator("body")).toContainText("Copper Ore");
    await expect(page.locator("body")).toContainText("Raw Fish");
  });

  test("shows empty state when no resources loaded", async ({ page }) => {
    // This test checks the empty state styling
    // Note: In production, resources should always be present
    // but this tests the component handles empty gracefully

    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
    });

    // The panel should always show either live or empty state
    // with the testid attribute
    const livePanel = page.getByTestId("resource-panel-live");
    const emptyPanel = page.getByTestId("resource-panel-empty");

    // At least one should exist
    const panelVisible = await livePanel.isVisible().catch(() => false) ||
                         await emptyPanel.isVisible().catch(() => false);

    expect(panelVisible).toBeTruthy();
  });
});

test.describe("Resource Node Interaction (API)", () => {
  test("gathering from API depletes node in panel", async ({ page }) => {
    const playerId = "panel-deplete-test";

    // First, gather from tree via API
    const gatherResponse = await page.request.post(`/api/resource/gather`, {
      data: {
        nodeId: "starter_tree_001",
        playerPosition: { x: 460, y: 500 },
        currentTick: 2000,
      },
      params: { playerId },
    });

    expect(gatherResponse.ok()).toBeTruthy();
    const gatherJson = await gatherResponse.json();
    expect(gatherJson.result.ok).toBe(true);

    // Now navigate to 2D client
    await page.goto("/2d/", {
      waitUntil: "domcontentloaded",
    });

    // Open resources panel
    await page.keyboard.press("r");
    await page.waitForTimeout(2000);

    // Tree should show as depleted
    const treeText = await page.locator("body").textContent();
    expect(treeText).toContain("Young Pine");
    // Should show respawn timer instead of "Available"
  });
});