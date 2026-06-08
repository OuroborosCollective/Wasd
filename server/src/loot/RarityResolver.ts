'use strict';

interface RarityPolicy {
  maxMagicFind: number;
  rarityWeights: Record<string, number>;
  affixRange: Record<string, [number, number]>;
}

class RarityResolver {
  private policy: RarityPolicy;

  constructor(policy: Partial<RarityPolicy> = {}) {
    this.policy = {
      maxMagicFind: 500,
      rarityWeights: {
        COMMON: 1000,
        MAGIC: 220,
        RARE: 70,
        EPIC: 18,
        LEGENDARY: 4,
        MYTHIC: 1
      },
      affixRange: {
        COMMON: [0, 0],
        MAGIC: [1, 2],
        RARE: [3, 4],
        EPIC: [5, 6],
        LEGENDARY: [6, 8],
        MYTHIC: [8, 10]
      },
      ...policy
    };
  }

  resolve({ rng, magicFind = 0, killStreak = 0, sourceRank = 'NORMAL' }: {
    rng: any;
    magicFind?: number;
    killStreak?: number;
    sourceRank?: string;
  }) {
    const mf = Math.max(0, Math.min(this.policy.maxMagicFind, Math.floor(magicFind)));
    const bossBonus = sourceRank === 'WORLD_BOSS' ? 2.5 : sourceRank === 'ELITE' ? 1.5 : 1;
    const pityBonus = Math.min(2, killStreak / 100);

    const tiers = Object.entries(this.policy.rarityWeights).map(([id, weight]) => {
      let adjustedWeight = weight;

      if (id !== 'COMMON') {
        adjustedWeight = Math.floor(
          weight *
          (1 + mf / 100) *
          bossBonus *
          (1 + pityBonus)
        );
      }

      return {
        id,
        weight: Math.max(1, adjustedWeight),
        affixRange: this.policy.affixRange[id] || [0, 0]
      };
    });

    return rng.weightedPick(tiers, 'weight') || tiers[0];
  }
}

export { RarityResolver };