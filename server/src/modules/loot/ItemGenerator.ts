export class ItemGenerator {
  generate(baseId: string, rarity: string, affixes: string[] = [], generatedAt = Date.now()) {
    return {
      id: baseId,
      rarity,
      affixes,
      generatedAt,
    };
  }
}
