const recipeInputCache = new WeakMap<any, string[]>();

export class RecipeMatcher {
  /**
   * Matches a set of input item IDs against a list of recipes.
   * Optimized to avoid redundant sorting and stringification.
   */
  match(inputIds: string[], recipes: any[]) {
    if (!inputIds || !recipes || recipes.length === 0) return null;

    // Hoist sorted inputIds to avoid re-sorting for every recipe
    const sortedInputs = [...inputIds].sort();
    const inputLen = sortedInputs.length;

    return recipes.find((r: any) => {
      // Cache sorted recipe inputs using WeakMap for O(1) retrieval
      let cached = recipeInputCache.get(r);
      if (!cached) {
        cached = [...r.inputs].sort();
        recipeInputCache.set(r, cached);
      }

      if (cached.length !== inputLen) return false;

      // Faster element-wise comparison than JSON.stringify
      for (let i = 0; i < inputLen; i++) {
        if (cached[i] !== sortedInputs[i]) return false;
      }
      return true;
    }) || null;
  }
}