export class ItemGenerator {
  generate(baseId: string, rarity: string, affixes: string[] = [], generatedAt = 0) {
    return {
      id: baseId,
      rarity,
      affixes,
      generatedAt
    };
  }
}
