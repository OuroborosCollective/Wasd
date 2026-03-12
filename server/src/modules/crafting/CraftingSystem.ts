export class CraftingSystem {
  canCraft(player:any, recipe:any, inventory:any[]) {
    if ((player.skills?.[recipe.skill]?.level ?? 0) < (recipe.requiredLevel ?? 1)) return false;
    return recipe.ingredients.every((ing:any) => inventory.some((item:any) => item.id === ing.id && (item.amount ?? 1) >= ing.amount));
  }

  craft(player:any, recipe:any) {
    return {
      crafted: true,
      itemId: recipe.result.id,
      amount: recipe.result.amount ?? 1,
      xp: recipe.xp ?? 0
    };
  }
}