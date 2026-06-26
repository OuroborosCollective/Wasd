const recipeCache = new WeakMap<any, string[]>();

export class RecipeMatcher {
  /**
   * Matches a set of input item IDs against a list of recipes.
   * Optimized to avoid redundant sorting and stringification.
   */
  match(inputIds: string[], recipes: any[]) {
    const sortedInputs = [...inputIds].sort();
    const len = sortedInputs.length;

    return (
      recipes.find((r: any) => {
        // O(1) length check fast-path
        if (r.inputs.length !== len) return false;

        // Cache sorted inputs using a WeakMap to avoid redundant O(N log N) work
        // and prevent mutation of potentially frozen recipe objects.
        let recipeInputs = recipeCache.get(r);
        if (!recipeInputs) {
          recipeInputs = [...r.inputs].sort();
          recipeCache.set(r, recipeInputs);
        }

        // O(N) element-wise comparison is faster than JSON.stringify overhead
        for (let i = 0; i < len; i++) {
          if (recipeInputs[i] !== sortedInputs[i]) return false;
        }
        return true;
      }) || null
    );
  }
}