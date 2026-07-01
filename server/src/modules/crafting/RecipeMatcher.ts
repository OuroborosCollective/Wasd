/**
 * RecipeMatcher.ts
 *
 * Optimized matching of crafting recipes based on input IDs.
 */

// Bolt: Cache for sorted recipe inputs to avoid redundant sorting and stringification.
// Since recipes are long-lived objects, a WeakMap is ideal to prevent memory leaks.
const recipeInputCache = new WeakMap<any, string[]>();

export class RecipeMatcher {
  /**
   * Finds a recipe whose inputs exactly match the passed inputIds (order-insensitive).
   */
  match(inputIds: string[], recipes: any[]) {
    const inputLen = inputIds.length;

    // Bolt: Sort inputs once per call.
    const sortedInputs = [...inputIds].sort();

    // Bolt: Use a classic for-loop for maximum performance in hot paths.
    for (let i = 0; i < recipes.length; i++) {
      const r = recipes[i];
      const rInputs = r.inputs || [];

      // Fast length check avoids deeper comparisons.
      // This also correctly handles recipes with 0 inputs when inputLen is 0.
      if (rInputs.length !== inputLen) continue;

      let cached = recipeInputCache.get(r);
      if (!cached) {
        cached = [...rInputs].sort();
        recipeInputCache.set(r, cached);
      }

      // Bolt: Element-wise comparison is significantly faster than JSON.stringify.
      let isMatch = true;
      for (let j = 0; j < inputLen; j++) {
        if (sortedInputs[j] !== cached[j]) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) return r;
    }

    return null;
  }
}
