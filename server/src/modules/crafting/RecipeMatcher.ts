const recipeInputsCache = new WeakMap<any, string[]>();

export class RecipeMatcher {
  /**
   * Matches input items against a list of recipes.
   * ⚡ Bolt Optimization: Uses a WeakMap to cache sorted recipe inputs and performs
   * element-wise comparison to avoid expensive JSON.stringify and redundant sorting.
   */
  match(inputIds: string[], recipes: any[]) {
    const sortedInputs = [...inputIds].sort();

    return (
      recipes.find((r: any) => {
        // Early return for length mismatch
        if (r.inputs.length !== inputIds.length) return false;

        let sortedRecipeInputs = recipeInputsCache.get(r);
        if (!sortedRecipeInputs) {
          sortedRecipeInputs = [...r.inputs].sort();
          recipeInputsCache.set(r, sortedRecipeInputs);
        }

        // Element-wise comparison is faster than JSON.stringify
        for (let i = 0; i < sortedRecipeInputs.length; i++) {
          if (sortedRecipeInputs[i] !== sortedInputs[i]) return false;
        }
        return true;
      }) || null
    );
  }
}