export class ItemGenerator {
  generate(baseId: string, rarity: string, affixes: string[] = []) {
    return {
      id: baseId,
      rarity,
      affixes,
      generatedAt: Date.now()
    };
  }
}