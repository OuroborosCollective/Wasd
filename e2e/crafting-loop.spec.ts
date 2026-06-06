/**
 * CRAFTING LOOP E2E TESTS
 *
 * End-to-end tests for deterministic crafting system.
 * Tests the full flow: gather tree → craft plank → verify inventory and XP.
 */

import { test, expect } from "@playwright/test";

test.describe("Crafting Loop", () => {
  test("gather wood then craft plank", async ({ request }) => {
    const playerId = "crafting-e2e-player";

    // Gather wood logs (need 2 for one plank)
    const gather1 = await request.post(`/api/resource/gather`, {
      data: {
        nodeId: "starter_tree_001",
        playerPosition: { x: 460, y: 500 },
        currentTick: 1000,
      },
      params: { playerId },
    });

    expect(gather1.ok()).toBeTruthy();
    const gather1Json = await gather1.json();
    expect(gather1Json.result.ok).toBe(true);
    expect(gather1Json.result.itemRewardId).toBe("wood_log");

    // Gather second wood log
    const gather2 = await request.post(`/api/resource/gather`, {
      data: {
        nodeId: "starter_tree_001",
        playerPosition: { x: 460, y: 500 },
        currentTick: 1031,
      },
      params: { playerId },
    });

    expect(gather2.ok()).toBeTruthy();
    const gather2Json = await gather2.json();
    expect(gather2Json.result.ok).toBe(true);

    // Now craft wood plank
    const craft = await request.post(`/api/crafting/craft`, {
      data: {
        recipeId: "craft_wood_plank",
      },
      params: { playerId },
    });

    expect(craft.ok()).toBeTruthy();
    const craftJson = await craft.json();
    expect(craftJson.ok).toBe(true);
    expect(craftJson.result.ok).toBe(true);
    expect(craftJson.result.reason).toBe("crafted");
    expect(craftJson.result.outputs).toEqual([
      {
        itemId: "wood_plank",
        quantity: 1,
      },
    ]);
    expect(craftJson.result.craftingXpReward).toBe(20);

    // Get gameplay snapshot and verify inventory
    const snapshot = await request.get(`/api/gameplay/snapshot`, {
      params: { playerId },
    });

    expect(snapshot.ok()).toBeTruthy();
    const snapshotJson = await snapshot.json();

    // Verify wood_plank is in inventory
    const slots = snapshotJson.snapshot.inventory.slots;
    const plankSlot = slots.find((slot: any) => slot.itemId === "wood_plank");
    expect(plankSlot).toBeDefined();
    expect(plankSlot.quantity).toBe(1);

    // Verify crafting XP increased
    const crafting = snapshotJson.snapshot.skills.find(
      (skill: any) => skill.id === "crafting"
    );
    expect(crafting).toBeDefined();
    expect(crafting.xp).toBeGreaterThanOrEqual(20);

    // Verify wood_log was consumed (should have 0 remaining)
    const woodLogSlot = slots.find((slot: any) => slot.itemId === "wood_log");
    expect(woodLogSlot).toBeDefined();
    expect(woodLogSlot.quantity).toBe(0);
  });

  test("rejects crafting without ingredients", async ({ request }) => {
    const playerId = "crafting-no-items-player";

    // Try to craft without gathering
    const craft = await request.post(`/api/crafting/craft`, {
      data: {
        recipeId: "craft_wood_plank",
      },
      params: { playerId },
    });

    expect(craft.status()).toBe(409);

    const json = await craft.json();
    expect(json.ok).toBe(false);
    expect(json.result.ok).toBe(false);
    expect(json.result.reason).toBe("missing_ingredients");
  });

  test("crafting recipes are in gameplay snapshot", async ({ request }) => {
    const playerId = "crafting-snapshot-player";

    const snapshot = await request.get(`/api/gameplay/snapshot`, {
      params: { playerId },
    });

    expect(snapshot.ok()).toBeTruthy();
    const json = await snapshot.json();

    // Verify crafting recipes are in snapshot
    expect(json.snapshot.crafting).toBeDefined();
    expect(json.snapshot.crafting.recipes).toBeDefined();
    expect(Array.isArray(json.snapshot.crafting.recipes)).toBe(true);
    expect(json.snapshot.crafting.recipes).toHaveLength(3);

    // Verify all starter recipes are present
    const recipeIds = json.snapshot.crafting.recipes.map((r: any) => r.id);
    expect(recipeIds).toContain("craft_wood_plank");
    expect(recipeIds).toContain("smelt_copper_ingot");
    expect(recipeIds).toContain("cook_raw_fish");

    // Verify recipe structure
    const plankRecipe = json.snapshot.crafting.recipes.find(
      (r: any) => r.id === "craft_wood_plank"
    );
    expect(plankRecipe).toEqual(
      expect.objectContaining({
        id: "craft_wood_plank",
        title: "Craft Wood Plank",
        requiredLevel: 1,
        craftingXpReward: 20,
        craftTicks: 5,
        craftable: false, // No ingredients yet
      })
    );

    // Verify ingredients and outputs
    expect(plankRecipe.ingredients).toEqual([
      { itemId: "wood_log", quantity: 2 },
    ]);
    expect(plankRecipe.outputs).toEqual([
      { itemId: "wood_plank", quantity: 1 },
    ]);
  });

  test("GET /api/crafting/recipes returns recipe list", async ({ request }) => {
    const playerId = "crafting-recipes-api-player";

    const response = await request.get(`/api/crafting/recipes`, {
      params: { playerId },
    });

    expect(response.ok()).toBeTruthy();

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.recipes).toBeDefined();
    expect(json.recipes).toHaveLength(3);

    // Recipes should be sorted
    const recipeIds = json.recipes.map((r: any) => r.id);
    expect(recipeIds).toEqual(["cook_raw_fish", "craft_wood_plank", "smelt_copper_ingot"]);
  });

  test("rejects invalid recipe ID", async ({ request }) => {
    const playerId = "crafting-invalid-recipe-player";

    const craft = await request.post(`/api/crafting/craft`, {
      data: {
        recipeId: "nonexistent_recipe",
      },
      params: { playerId },
    });

    expect(craft.status()).toBe(409);

    const json = await craft.json();
    expect(json.result.reason).toBe("recipe_not_found");
  });

  test("gather ore then smelt copper ingot", async ({ request }) => {
    const playerId = "crafting-smelt-player";

    // Gather 3 copper ore
    for (let i = 0; i < 3; i++) {
      const gather = await request.post(`/api/resource/gather`, {
        data: {
          nodeId: "starter_ore_001",
          playerPosition: { x: 540, y: 520 },
          currentTick: 1000 + i,
        },
        params: { playerId },
      });

      expect(gather.ok()).toBeTruthy();
      const gatherJson = await gather.json();
      expect(gatherJson.result.itemRewardId).toBe("copper_ore");
    }

    // Smelt copper ingot
    const craft = await request.post(`/api/crafting/craft`, {
      data: {
        recipeId: "smelt_copper_ingot",
      },
      params: { playerId },
    });

    expect(craft.ok()).toBeTruthy();
    const craftJson = await craft.json();
    expect(craftJson.result.ok).toBe(true);
    expect(craftJson.result.outputs).toEqual([
      { itemId: "copper_ingot", quantity: 1 },
    ]);
    expect(craftJson.result.craftingXpReward).toBe(30);
  });

  test("gather fish then cook raw fish", async ({ request }) => {
    const playerId = "crafting-cook-player";

    // Gather raw fish
    const gather = await request.post(`/api/resource/gather`, {
      data: {
        nodeId: "starter_fish_001",
        playerPosition: { x: 500, y: 580 },
        currentTick: 1000,
      },
      params: { playerId },
    });

    expect(gather.ok()).toBeTruthy();
    const gatherJson = await gather.json();
    expect(gatherJson.result.itemRewardId).toBe("raw_fish");

    // Cook raw fish
    const craft = await request.post(`/api/crafting/craft`, {
      data: {
        recipeId: "cook_raw_fish",
      },
      params: { playerId },
    });

    expect(craft.ok()).toBeTruthy();
    const craftJson = await craft.json();
    expect(craftJson.result.ok).toBe(true);
    expect(craftJson.result.outputs).toEqual([
      { itemId: "cooked_fish", quantity: 1 },
    ]);
    expect(craftJson.result.craftingXpReward).toBe(15);
  });
});