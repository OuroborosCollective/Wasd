export class ItemGenerator {
  private rarities = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
  private affixes = ["Strength", "Dexterity", "Intelligence", "Resilience", "Agility"];

  generate(baseId: string, minRarityIndex: number = 0) {
    const rarityIndex = Math.min(this.rarities.length - 1, minRarityIndex + Math.floor(Math.pow(Math.random(), 3) * (this.rarities.length - minRarityIndex)));
    const rarity = this.rarities[rarityIndex];

    const affixCount = rarityIndex; // epic (3) has 3 affixes, etc.
    const itemAffixes = [];
    const availableAffixes = [...this.affixes];

    for (let i = 0; i < affixCount; i++) {
      if (availableAffixes.length === 0) break;
      const idx = Math.floor(Math.random() * availableAffixes.length);
      const name = availableAffixes.splice(idx, 1)[0];
      itemAffixes.push({ name: `+${name}`, value: 1 + Math.floor(Math.random() * (rarityIndex + 1) * 2) });
    }

    return {
      id: `${baseId}_${Date.now()}`,
      baseId,
      rarity,
      affixes: itemAffixes,
      itemPower: (rarityIndex + 1) * 10 + Math.floor(Math.random() * 10)
    };
  }
}
