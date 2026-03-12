export class AffixSystem {
  rollAffixes(rarity: string) {
    const pool = [
      "plus_strength",
      "plus_health",
      "plus_attack_speed",
      "plus_mining",
      "plus_fire_resistance"
    ];

    const countMap: Record<string, number> = {
      common: 0,
      uncommon: 1,
      rare: 2,
      epic: 3,
      legendary: 4,
      mythic: 5
    };

    const count = countMap[rarity] ?? 0;
    return pool.slice(0, count);
  }
}