export class RecipeMatcher {
  match(inputIds: string[], recipes: any[]) {
    if (!inputIds || !recipes || recipes.length === 0) return null;

    // Optimization: Sort and stringify inputs only once outside the loop
    // Replace expensive JSON.stringify with faster Array.join
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
