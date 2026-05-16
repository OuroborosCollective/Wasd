export class ItemGenerator {
  generate(baseId: string, rarity: string, affixes: string[] = [], generatedAt?: number) {
    return {
      id: baseId,
      rarity,
      affixes,
      generatedAt: generatedAt ?? Date.now(),
    };
  }
}
