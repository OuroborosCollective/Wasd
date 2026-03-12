export class RecipeMatcher {
  match(inputIds:string[], recipes:any[]){
    return recipes.find((r:any)=> JSON.stringify([...r.inputs].sort()) === JSON.stringify([...inputIds].sort())) || null;
  }
}