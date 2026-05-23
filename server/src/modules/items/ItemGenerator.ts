export class ItemGenerator {
  generate(baseId:string, rarity:string, affixes:any[] = []) {
    return {
      id: `${baseId}_${rarity}_${Date.now()}`,
      baseId,
      rarity,
      affixes
    };
  }
}