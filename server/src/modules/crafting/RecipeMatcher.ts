export class RecipeMatcher {
  match(inputIds: string[], recipes: any[]) {
    if (recipes.length === 0) return null;

    // Bolt: Optimization - Hoist sorting of inputIds to avoid redundant sorting in the find loop.
    const sortedInputs = [...inputIds].sort();
    const inputLen = sortedInputs.length;

    return (
      recipes.find((r: any) => {
        // Bolt: Optimization - O(1) length check avoids sorting and stringification for non-matching recipes.
        if (!Array.isArray(r.inputs) || r.inputs.length !== inputLen) return false;

        // Bolt: Optimization - Cache sorted inputs on the recipe object to avoid redundant O(N log N) sorting.
        if (!r._sortedInputs) {
          r._sortedInputs = [...r.inputs].sort();
        }

        // Bolt: Optimization - Direct element-wise comparison avoids O(N) JSON.stringify overhead.
        for (let i = 0; i < inputLen; i++) {
          if (r._sortedInputs[i] !== sortedInputs[i]) return false;
        }
        return true;
      }) || null
    );
  }
}
