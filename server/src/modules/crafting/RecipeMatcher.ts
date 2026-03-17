export class RecipeMatcher {
  match(inputIds:string[], recipes:any[]){
    // Optimization: Loop-Invariant Code Motion.
    // Move repetitive array sorting and serialization of static inputs outside of the loop.
    // Use .join(',') instead of JSON.stringify() for faster serialization.
    const sortedInputsStr = [...inputIds].sort().join(',');
    return recipes.find((r:any)=> [...r.inputs].sort().join(',') === sortedInputsStr) || null;
  }
}