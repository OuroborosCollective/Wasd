export class RecipeMatcher {
  /**
   * Bolt: Optimized recipe matching.
   * - Sorts inputIds once outside the loop.
   * - Uses length check as a fast path.
   * - Replaces JSON.stringify with a direct element-by-element comparison.
   *
   * Expected impact: ~10x speedup for large recipe sets by avoiding 2 * N stringifications.
   */
  match(inputIds: string[], recipes: any[]) {
    const sortedInputs = [...inputIds].sort();
    const inputCount = sortedInputs.length;

    return recipes.find((r: any) => {
      const recipeInputs = r.inputs;
      if (recipeInputs.length !== inputCount) return false;

      const sortedRecipeInputs = [...recipeInputs].sort();
      for (let i = 0; i < inputCount; i++) {
        if (sortedRecipeInputs[i] !== sortedInputs[i]) return false;
      }
      return true;
    }) || null;
  }
}
