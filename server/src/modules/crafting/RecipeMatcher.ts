const recipeInputCache = new WeakMap<any, string[]>();

export class RecipeMatcher {
  match(inputIds: string[], recipes: any[]) {
    // Bolt: Optimization - Hoist sorting out of the loop
    const sortedInputs = [...inputIds].sort();

    return recipes.find((r: any) => {
      // Bolt: Optimization - Cache sorted inputs per recipe to avoid redundant sorting and allocation
      let cached = recipeInputCache.get(r);
      if (cached === undefined) {
        cached = [...r.inputs].sort();
        recipeInputCache.set(r, cached);
      }

      // Bolt: Optimization - Fast element-wise comparison is significantly faster than JSON.stringify
      if (cached.length !== sortedInputs.length) return false;
      for (let i = 0; i < cached.length; i++) {
        if (cached[i] !== sortedInputs[i]) return false;
      }
      return true;
    }) || null;
  }
}
