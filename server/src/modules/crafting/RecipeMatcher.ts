export interface CraftingRecipeLike {
  inputs?: readonly string[];
}

export class RecipeMatcher {
  /**
   * Matches an array of input item IDs against a list of recipes.
   *
   * The implementation keeps the hot-path optimization local to this call:
   * - input IDs are sorted once;
   * - recipe length is checked before sorting;
   * - sorted recipe inputs are stored only in a per-call WeakMap;
   * - recipe objects are never mutated with cache fields.
   */
  match<TRecipe extends CraftingRecipeLike>(inputIds: readonly string[], recipes: readonly TRecipe[]): TRecipe | null {
    const inputLength = inputIds.length;
    const sortedInputIds = [...inputIds].sort();
    const sortedRecipeCache = new WeakMap<TRecipe, readonly string[]>();

    for (const recipe of recipes) {
      const recipeInputs = recipe.inputs ?? [];
      if (recipeInputs.length !== inputLength) continue;

      let sortedRecipeInputs = sortedRecipeCache.get(recipe);
      if (!sortedRecipeInputs) {
        sortedRecipeInputs = [...recipeInputs].sort();
        sortedRecipeCache.set(recipe, sortedRecipeInputs);
      }

      let isMatch = true;
      for (let index = 0; index < inputLength; index += 1) {
        if (sortedRecipeInputs[index] !== sortedInputIds[index]) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) return recipe;
    }

    return null;
  }
}
