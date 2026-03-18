export class RecipeMatcher {
  match(inputIds: string[], recipes: any[]) {
    if (!inputIds || !recipes || recipes.length === 0) return null;

    // Optimization: Loop-Invariant Code Motion + Early Exit
    // Hoist the O(N log N) sorting and string serialization of the static input array
    // outside of the recipes loop to eliminate redundant object allocations per iteration.
    const inputKey = [...inputIds].sort().join(',');

    for (const r of recipes) {
      if (!r.inputs) continue;

      // Optimization: Early exit if lengths don't match
      if (r.inputs.length !== inputIds.length) continue;

      const recipeKey = [...r.inputs].sort().join(',');
      if (recipeKey === inputKey) return r;
    }

    return null;
  }
}
