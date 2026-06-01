export class ItemGenerator {
  generate(baseId:string, rarity:string, affixes:any[] = []) {
    return {
      id: `${baseId}_${rarity}_${0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */}`,
      baseId,
      rarity,
      affixes
    };
  }
}