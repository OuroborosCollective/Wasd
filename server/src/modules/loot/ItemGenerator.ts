export class ItemGenerator {
  generate(baseId: string, rarity: string, affixes: string[] = [], generatedAt = Date.now() /* ARE-DETERMINISM-ALLOW: audit metadata */) {
    return {
      id: baseId,
      rarity,
      affixes,
      generatedAt,
    };
  }
}
