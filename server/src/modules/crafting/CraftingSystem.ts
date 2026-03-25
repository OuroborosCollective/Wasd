export interface Recipe {
  id: string;
  name: string;
  skill?: string;
  requiredSkill?: string;
  requiredLevel: number;
  ingredients: Array<{ id?: string; itemId?: string; amount?: number; count?: number }>;
  result: { id?: string; itemId?: string; amount?: number; count?: number };
  xp?: number;
  xpReward?: number;
  skillName?: string;
}

export class CraftingSystem {
  private recipes: Map<string, Recipe> = new Map();

  async loadRecipes() {
    try {
      const fs = require("fs");
      const path = require("path");
      const recipesPath = path.join(process.cwd(), "game-data", "crafting", "recipes.json");
      const data = await fs.promises.readFile(recipesPath, "utf8");
      const recipes = JSON.parse(data);
      recipes.forEach((r: Recipe) => this.addRecipe(r));
    } catch (err) {
      console.error("Failed to load crafting recipes:", err);
      // Fallback recipes
      this.addRecipe({
        id: "iron_sword_craft",
        name: "Iron Sword",
        requiredLevel: 1,
        ingredients: [{ id: "iron_bar", amount: 2 }],
        result: { id: "iron_sword", amount: 1 }
      });
    }
  }

  addRecipe(recipe: Recipe) {
    this.recipes.set(recipe.id, recipe);
  }

  getRecipes() {
    return Array.from(this.recipes.values());
  }

  canCraft(player: any, recipeId: string) {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) return { possible: false, reason: "Recipe not found" };

    const skillName = recipe.skill || recipe.requiredSkill || recipe.skillName;
    const playerLevel = player.skills?.[skillName as string]?.level ?? 0;
    if (playerLevel < recipe.requiredLevel) {
      return { possible: false, reason: "Skill level too low" };
    }

    const hasIngredients = recipe.ingredients.every((ing: any) => {
      const ingId = ing.id || ing.itemId;
      const ingCount = ing.amount || ing.count || 1;
      const count = player.inventory.filter((item: any) => item.id === ingId).length;
      return count >= ingCount;
    });

    if (!hasIngredients) {
      return { possible: false, reason: "Missing ingredients" };
    }

    return { possible: true };
  }

  craft(player: any, recipeId: string) {
    const canCraftResult = this.canCraft(player, recipeId);
    if (!canCraftResult.possible) {
      return { success: false, reason: canCraftResult.reason };
    }

    const recipe = this.recipes.get(recipeId)!;
    
    // Consume ingredients
    recipe.ingredients.forEach((ing: any) => {
      const ingId = ing.id || ing.itemId;
      const ingCount = ing.amount || ing.count || 1;
      for (let i = 0; i < ingCount; i++) {
        const index = player.inventory.findIndex((item: any) => item.id === ingId);
        if (index !== -1) player.inventory.splice(index, 1);
      }
    });

    // Add result
    const resultId = recipe.result.id || recipe.result.itemId;
    const resultCount = recipe.result.amount || recipe.result.count || 1;
    for (let i = 0; i < resultCount; i++) {
      player.inventory.push({ id: resultId });
    }

    return {
      success: true,
      item: { id: resultId },
      itemId: resultId,
      amount: resultCount,
      xp: recipe.xp || recipe.xpReward || 0
    };
  }
}