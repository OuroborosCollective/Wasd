import { MatrixEnergySystem } from "../economy/MatrixEnergySystem.js";

export class CraftingSystem {
  constructor(private matrixEnergy: MatrixEnergySystem) {}

  canCraft(player: any, recipe: any) {
    // Check Matrix Energy requirement
    const energyCost = recipe.energyCost || 10;
    if (this.matrixEnergy.getBalance(player.id) < energyCost) return false;

    // Check Skill
    if ((player.skills?.[recipe.skill]?.level ?? 0) < (recipe.requiredLevel ?? 1)) return false;

    // Check Ingredients
    return recipe.ingredients.every((ing: any) => {
      const count = player.inventory.filter((item: any) => item.id === ing.id).length;
      return count >= (ing.amount || 1);
    });
  }

  craft(player: any, recipe: any) {
    if (!this.canCraft(player, recipe)) return { success: false };

    // Consume energy
    this.matrixEnergy.consume(player.id, recipe.energyCost || 10);

    // Consume items
    recipe.ingredients.forEach((ing: any) => {
      for (let i = 0; i < (ing.amount || 1); i++) {
        const idx = player.inventory.findIndex((it: any) => it.id === ing.id);
        if (idx !== -1) player.inventory.splice(idx, 1);
      }
    });

    return {
      success: true,
      resultId: recipe.resultId,
      xp: recipe.xp || 5
    };
  }
}
