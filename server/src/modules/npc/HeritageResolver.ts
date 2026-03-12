export class HeritageResolver {
  resolve(culture:string, religion:string, house:string){
    return {
      culture,
      religion,
      house,
      heritageKey: `${culture}:${religion}:${house}`
    };
  }
}