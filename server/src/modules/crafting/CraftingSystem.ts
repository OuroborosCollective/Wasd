import { ItemRegistry } from "../inventory/ItemRegistry.js";
import fs from "fs";
import path from "path";

export interface Recipe {
  id: string;
  name: string;
  ingredients: { itemId: string; count: number }[];
  result: { itemId: string; count: number };
  requiredSkill?: string;
  requiredLevel?: number;
  xpReward?: number;
  skillName?: string;
}

export class CraftingSystem {
  private recipes: Map<string, Recipe> = new Map();

  constructor() {
  }

  async loadRecipes() {
    try {
      const recipesPath = path.resolve(process.cwd(), "game-data/crafting/recipes.json");
      try {
        const fileContent = await fs.promises.readFile(recipesPath, "utf-8");
        const data = JSON.parse(fileContent);
        if (Array.isArray(data)) {
          data.forEach((r: Recipe) => this.recipes.set(r.id, r));
        } else if (data.recipes) {
          data.recipes.forEach((r: Recipe) => this.recipes.set(r.id, r));
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
    } catch (e) {
      console.error("Failed to load crafting recipes:", e);
    }
    if (this.recipes.size === 0) {
      this.recipes.set("iron_sword_craft", {
        id: "iron_sword_craft", name: "Craft Iron Sword",
        ingredients: [{ itemId: "iron_scrap", count: 3 }],
        result: { itemId: "iron_sword", count: 1 },
        requiredSkill: "smithing", requiredLevel: 1, xpReward: 50, skillName: "smithing"
      });
      this.recipes.set("health_potion_craft", {
        id: "health_potion_craft", name: "Brew Health Potion",
        ingredients: [{ itemId: "herb_bundle", count: 2 }],
        result: { itemId: "health_potion", count: 1 },
        requiredSkill: "cooking", requiredLevel: 1, xpReward: 30, skillName: "cooking"
      });
    }
  }

  getRecipes(): Recipe[] {
    return Array.from(this.recipes.values());
  }

  addRecipe(recipe: Recipe) {
    this.recipes.set(recipe.id, recipe);
  }

  canCraft(player: any, recipeId: string): { possible: boolean; reason?: string } {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) return { possible: false, reason: "Recipe not found" };
    if (recipe.requiredSkill && recipe.requiredLevel) {
      if (!player.skills || !player.skills[recipe.requiredSkill]) {
        return { possible: false, reason: `Need ${recipe.requiredSkill} level ${recipe.requiredLevel}` };
      }
      const level = player.skills?.[recipe.requiredSkill]?.level ?? 1;
      if (level < recipe.requiredLevel) {
        return { possible: false, reason: `Need ${recipe.requiredSkill} level ${recipe.requiredLevel}` };
      }
    }
    // Optimization: Use a frequency map for O(N) inventory check instead of O(I*N)
    const inventory = player.inventory || [];
    const itemCounts = new Map<string, number>();
    for (const item of inventory) {
      const id = item.id;
      const current = itemCounts.get(id) || 0;
      itemCounts.set(id, current + 1);
    }

    for (const ing of recipe.ingredients) {
      const count = itemCounts.get(ing.itemId) || 0;
      if (count < ing.count) {
        const itemDef = ItemRegistry.getItem(ing.itemId);
        return { possible: false, reason: `Need ${ing.count}x ${itemDef?.name || ing.itemId}` };
      }
    }
    return { possible: true };
  }

  craft(player: any, recipeId: string): { success: boolean; item?: any; xp?: number; skillName?: string; reason?: string } {
    const check = this.canCraft(player, recipeId);
    if (!check.possible) return { success: false, reason: check.reason };
    const recipe = this.recipes.get(recipeId)!;
    // ⚡ Bolt Optimization: Use a single backwards pass to remove required ingredients,
    // avoiding multiple O(N) findIndex() and splice() calls that shift the array repeatedly.
    for (const ing of recipe.ingredients) {
      let needed = ing.count;
      for (let i = player.inventory.length - 1; i >= 0 && needed > 0; i--) {
        if (player.inventory[i].id === ing.itemId) {
          player.inventory.splice(i, 1);
          needed--;
        }
      }
    }
    for (let i = 0; i < recipe.result.count; i++) {
      const item = ItemRegistry.createInstance(recipe.result.itemId);
      if (item) player.inventory.push(item);
    }
    return {
      success: true,
      item: ItemRegistry.getItem(recipe.result.itemId),
      xp: recipe.xpReward || 10,
      skillName: recipe.skillName || "crafting"
    };
  }
}