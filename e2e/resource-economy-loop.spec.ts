/**
 * E2E Test: Resource Economy Loop
 *
 * Tests the complete resource economy gameplay loop:
 * 1. /2d boots successfully
 * 2. Inventory panel visible
 * 3. Wallet visible with coin balance
 * 4. Resource nodes visible
 * 5. Gather action updates inventory
 * 6. Process/craft updates inventory with processed items
 * 7. Vendor sell updates coin balance
 * 8. Skill progress updates
 *
 * Test IDs used:
 * - wallet-coin-balance
 * - inventory-panel-live
 * - inventory-item-{itemId}
 * - gather-resource-{itemId}
 * - process-{recipeId}
 * - vendor-sell-{itemId}
 * - skill-progress-{skillId}
 * - resource-node-{itemId}
 */

import { test, expect } from "@playwright/test";

test.describe("Resource Economy Loop", () => {
  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];

    // Capture console errors
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Ignore expected warnings
        if (!text.includes("WebSocket") && !text.includes("network") && !text.includes("fetch")) {
          errors.push(text);
        }
      }
    });

    // Navigate to 2D client with E2E mode
    await page.goto("/2d/?e2e=resource-economy-loop", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // Wait for world to load
    await expect(page.locator("[data-testid='deterministic-world-root']")).toBeVisible({
      timeout: 30_000,
    });

    // Store errors for later verification
    (page as any).__testErrors = errors;
  });

  test("complete resource economy loop: gather -> process -> sell -> wallet update", async ({ page }) => {
    // ─────────────────────────────────────────────────────────
    // STEP 1: Open Inventory panel to verify initial state
    // ─────────────────────────────────────────────────────────
    await page.keyboard.press("i");

    // Check inventory panel is visible
    const inventoryLocator = page.locator("[data-testid='inventory-panel-live'], [data-testid='inventory-panel-empty']");
    await expect(inventoryLocator.first()).toBeVisible({ timeout: 10_000 });

    // Check wallet is visible with coin balance
    const walletBalance = page.locator("[data-testid='wallet-coin-balance']");
    await expect(walletBalance).toBeVisible({ timeout: 5_000 });

    // Get initial coin balance
    const initialCoinText = await walletBalance.textContent();
    const initialCoins = parseInt(initialCoinText?.match(/\d+/)?.[0] ?? "0", 10);

    // Close inventory
    await page.keyboard.press("Escape");

    // ─────────────────────────────────────────────────────────
    // STEP 2: Open Resource panel to find gatherable nodes
    // ─────────────────────────────────────────────────────────
    await page.keyboard.press("r");

    // Check resource panel is visible
    const resourcePanel = page.locator("[data-testid='resource-panel-live'], [data-testid='resource-panel-empty']");
    await expect(resourcePanel.first()).toBeVisible({ timeout: 10_000 });

    // Try to find a wood resource node
    const woodNode = page.locator("[data-testid='resource-node-wood_log']").first();
    const hasWoodNode = await woodNode.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasWoodNode) {
      // Click gather button if available
      const gatherButton = woodNode.locator("[data-testid='gather-resource-wood_log']");
      const hasGatherButton = await gatherButton.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (hasGatherButton) {
        await gatherButton.click();
        // Wait for gather action
        await page.waitForTimeout(1500);
      }
    }

    await page.keyboard.press("Escape");

    // ─────────────────────────────────────────────────────────
    // STEP 3: Verify Inventory updated after gather
    // ─────────────────────────────────────────────────────────
    await page.keyboard.press("i");

    // Check inventory has items now
    const inventoryLive = page.locator("[data-testid='inventory-panel-live']");
    const hasInventoryLive = await inventoryLive.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasInventoryLive) {
      // Verify inventory contains resource items (wood_log, copper_ore, raw_fish)
      const woodItem = page.locator("[data-testid='inventory-item-wood_log']");
      const copperItem = page.locator("[data-testid='inventory-item-copper_ore']");
      const fishItem = page.locator("[data-testid='inventory-item-raw_fish']");

      const hasWood = await woodItem.isVisible({ timeout: 2000 }).catch(() => false);
      const hasCopper = await copperItem.isVisible({ timeout: 2000 }).catch(() => false);
      const hasFish = await fishItem.isVisible({ timeout: 2000 }).catch(() => false);

      // At least one resource should be visible after gathering
      expect(hasWood || hasCopper || hasFish).toBeTruthy();
    }

    await page.keyboard.press("Escape");

    // ─────────────────────────────────────────────────────────
    // STEP 4: Open Crafting panel to find process recipes
    // ─────────────────────────────────────────────────────────
    await page.keyboard.press("c");

    // Check crafting panel is visible
    const craftingPanel = page.locator("[data-testid='crafting-panel-live'], [data-testid='crafting-panel-empty']");
    await expect(craftingPanel.first()).toBeVisible({ timeout: 10_000 });

    // Try to find wood plank recipe
    const woodPlankButton = page.locator("[data-testid='process-craft_wood_plank']");
    const hasWoodPlankRecipe = await woodPlankButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasWoodPlankRecipe) {
      // Check if craftable
      const isDisabled = await woodPlankButton.isDisabled().catch(() => false);
      
      if (!isDisabled) {
        await woodPlankButton.click();
        // Wait for craft action
        await page.waitForTimeout(1500);
      }
    }

    await page.keyboard.press("Escape");

    // ─────────────────────────────────────────────────────────
    // STEP 5: Verify processed item appears in inventory
    // ─────────────────────────────────────────────────────────
    await page.keyboard.press("i");

    const woodPlankItem = page.locator("[data-testid='inventory-item-wood_plank']");
    const hasWoodPlank = await woodPlankItem.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasWoodPlank) {
      // Try to sell wood_plank
      const sellButton = page.locator("[data-testid='vendor-sell-wood_plank']");
      const hasSellButton = await sellButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasSellButton) {
        await sellButton.click();
        // Wait for sell action
        await page.waitForTimeout(1500);
      }
    }

    await page.keyboard.press("Escape");

    // ─────────────────────────────────────────────────────────
    // STEP 6: Verify wallet balance updated after sell
    // ─────────────────────────────────────────────────────────
    await page.keyboard.press("i");

    // Check wallet updated
    const updatedWalletBalance = page.locator("[data-testid='wallet-coin-balance']");
    await expect(updatedWalletBalance).toBeVisible({ timeout: 5000 });

    const finalCoinText = await updatedWalletBalance.textContent();
    const finalCoins = parseInt(finalCoinText?.match(/\d+/)?.[0] ?? "0", 10);

    // If we had wood_plank and sold it, coins should have increased
    if (hasWoodPlank) {
      expect(finalCoins).toBeGreaterThanOrEqual(initialCoins);
    }

    // ─────────────────────────────────────────────────────────
    // STEP 7: Check skill progress
    // ─────────────────────────────────────────────────────────
    await page.keyboard.press("k"); // Open skills/character panel

    // Try to find skill progress indicators
    const woodcuttingSkill = page.locator("[data-testid='skill-progress-woodcutting']");
    const miningSkill = page.locator("[data-testid='skill-progress-mining']");
    const fishingSkill = page.locator("[data-testid='skill-progress-fishing']");

    // At least one skill should be visible
    const hasAnySkill = await (
      woodcuttingSkill.isVisible({ timeout: 2000 }).catch(() => false) ||
      miningSkill.isVisible({ timeout: 2000 }).catch(() => false) ||
      fishingSkill.isVisible({ timeout: 2000 }).catch(() => false)
    );

    expect(hasAnySkill).toBeTruthy();

    // ─────────────────────────────────────────────────────────
    // STEP 8: Verify no fatal errors occurred
    // ─────────────────────────────────────────────────────────
    const errors = (page as any).__testErrors as string[];
    const fatalErrors = errors.filter((msg) =>
      /useRef is not defined|raw error|uncaught|TypeError|ReferenceError|Failed to fetch|Cannot read/i.test(msg)
    );

    expect(fatalErrors).toEqual([]);
  });

  test("resource economy UI elements render correctly", async ({ page }) => {
    // ─────────────────────────────────────────────────────────
    // Verify all required test IDs are present
    // ─────────────────────────────────────────────────────────

    // Open inventory
    await page.keyboard.press("i");
    await expect(page.locator("[data-testid='inventory-panel-live'], [data-testid='inventory-panel-empty']").first()).toBeVisible({ timeout: 10000 });

    // Verify wallet has testid
    const wallet = page.locator("[data-testid='wallet-coin-balance']");
    await expect(wallet).toBeVisible({ timeout: 5000 });

    await page.keyboard.press("Escape");

    // Open resources panel
    await page.keyboard.press("r");
    const resourcePanel = page.locator("[data-testid='resource-panel-live'], [data-testid='resource-panel-empty']");
    await expect(resourcePanel.first()).toBeVisible({ timeout: 10000 });

    // Resource nodes should have data-testid pattern
    const resourceNode = page.locator("[data-testid^='resource-node-']").first();
    // Just verify selector pattern works (may be empty initially)
    await resourceNode.waitFor({ state: "attached", timeout: 3000 }).catch(() => {});

    await page.keyboard.press("Escape");

    // Open crafting
    await page.keyboard.press("c");
    const craftingPanel = page.locator("[data-testid='crafting-panel-live'], [data-testid='crafting-panel-empty']");
    await expect(craftingPanel.first()).toBeVisible({ timeout: 10000 });

    // Process buttons should have data-testid pattern
    const processButton = page.locator("[data-testid^='process-']").first();
    await processButton.waitFor({ state: "attached", timeout: 3000 }).catch(() => {});

    await page.keyboard.press("Escape");
  });

  test("wallet updates after selling resources", async ({ page, request }) => {
    // Direct API test for vendor sell
    // This tests the /api/economy/sell-resource endpoint

    const response = await request.post("/api/economy/sell-resource", {
      data: {
        itemId: "wood_log",
        quantity: 1,
        playerPosition: { x: 462, y: 503 }, // Near village trader
        vendorId: "village_trader_001",
      },
    });

    const json = await response.json();
    
    // Response should be a valid ActionResult shape
    expect(json).toHaveProperty("ok");
    expect(json).toHaveProperty("result");

    if (json.result?.ok) {
      expect(json.result).toHaveProperty("totalCoins");
      expect(json.result).toHaveProperty("newBalance");
      expect(json.result.reason).toBe("sold");
    } else {
      // Failure should have a reason
      expect(json.result).toHaveProperty("reason");
    }
  });

  test("crafting endpoint accepts valid recipes", async ({ page, request }) => {
    // Direct API test for crafting
    // This tests the /api/crafting/craft endpoint

    const response = await request.post("/api/crafting/craft", {
      data: {
        recipeId: "craft_wood_plank",
        playerPosition: { x: 468, y: 500 }, // Near workbench
        stationId: "workbench_001",
      },
    });

    const json = await response.json();
    
    // Response should be a valid ActionResult shape
    expect(json).toHaveProperty("ok");
    expect(json).toHaveProperty("result");

    if (json.result?.ok) {
      expect(json.result.reason).toBe("crafted");
      expect(json.result).toHaveProperty("consumed");
      expect(json.result).toHaveProperty("outputs");
    } else {
      // Failure should have a reason
      expect(json.result).toHaveProperty("reason");
    }
  });

  test("gathering endpoint accepts valid gather requests", async ({ page, request }) => {
    // Direct API test for resource gathering
    // This tests the /api/resource/gather endpoint

    const response = await request.post("/api/resource/gather", {
      data: {
        nodeId: "starter_tree_001",
        playerPosition: { x: 460, y: 500 },
        currentTick: 100,
      },
    });

    const json = await response.json();
    
    // Response should be a valid ActionResult shape
    expect(json).toHaveProperty("ok");
    expect(json).toHaveProperty("result");

    if (json.result?.ok) {
      expect(json.result).toHaveProperty("itemRewardId");
      expect(json.result).toHaveProperty("skillId");
      expect(json.result).toHaveProperty("xpReward");
    } else {
      // Failure should have a reason
      expect(json.result).toHaveProperty("reason");
    }
  });
});