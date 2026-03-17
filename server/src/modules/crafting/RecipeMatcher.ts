export class RecipeMatcher {
  match(inputIds:string[], recipes:any[]){
    // Optimization: Loop-Invariant Code Motion
    // Avoid re-sorting and stringifying the static input array O(N log N) for every recipe
    const serializedInputs = JSON.stringify([...inputIds].sort());
    return recipes.find((r:any)=> JSON.stringify([...r.inputs].sort()) === serializedInputs) || null;
  }
}