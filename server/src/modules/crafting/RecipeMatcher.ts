export class RecipeMatcher {
  match(inputIds: string[], recipes: any[]) {
    // Optimization: Loop-Invariant Code Motion
    // Hoist the O(N log N) sorting and string serialization of the static input array
    // outside of the recipes loop to eliminate redundant object allocations per iteration.
    const sortedInputStr = [...inputIds].sort().join(',');

    return recipes.find((r: any) =>
      [...r.inputs].sort().join(',') === sortedInputStr
    ) || null;
  }
}