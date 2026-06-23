export class RecipeMatcher {
  /**
   * Matches an array of input item IDs against a list of recipes.
   * Optimizes by pre-sorting input IDs and caching sorted recipe inputs.
   *
   * @param inputIds - Unsorted list of item IDs provided by the user.
   * @param recipes - List of recipe objects, each having an `inputs` array of item IDs.
   * @returns The matching recipe or null.
   */
  match(inputIds: string[], recipes: any[]) {
    // Bolt: Performance optimization.
    // 1. Length check is a O(1) fast path.
    // 2. Pre-sorting inputs once avoids O(N log N) inside the loop.
    // 3. Caching sorted recipe inputs avoids repeated sorting.
    // 4. Direct element comparison avoids expensive JSON.stringify.

    const len = inputIds.length;
    const sortedInputs = [...inputIds].sort();

    for (const r of recipes) {
      const recipeInputs = r.inputs || [];
      if (recipeInputs.length !== len) continue;

      if (!r._sortedInputs) {
        r._sortedInputs = [...recipeInputs].sort();
      }

      const sortedR = r._sortedInputs;
      let match = true;
      for (let i = 0; i < len; i++) {
        if (sortedR[i] !== sortedInputs[i]) {
          match = false;
          break;
        }
      }

      if (match) return r;
    }

    return null;
  }
}
