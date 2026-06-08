'use strict';

class TreasureClassRegistry {
  private db: any;
  private fallbackClasses: any;

  constructor(db: any) {
    this.db = db;

    this.fallbackClasses = Object.freeze({
      TC_ACT1_BEAST: {
        id: 'TC_ACT1_BEAST',
        rolls: 1,
        noDropWeight: 700,
        entries: [
          { type: 'baseType', id: 'weapon.sword', weight: 80 },
          { type: 'baseType', id: 'armor.light', weight: 100 },
          { type: 'baseType', id: 'consumable.potion', weight: 200 },
          { type: 'treasureClass', id: 'TC_GOLD_SMALL', weight: 300 }
        ]
      },

      TC_GOLD_SMALL: {
        id: 'TC_GOLD_SMALL',
        rolls: 1,
        noDropWeight: 200,
        entries: [
          { type: 'currency', id: 'gold', min: 3, max: 15, weight: 1000 }
        ]
      },

      TC_BOSS_WORLD: {
        id: 'TC_BOSS_WORLD',
        rolls: 6,
        noDropWeight: 0,
        entries: [
          { type: 'baseType', id: 'weapon.sword', weight: 150 },
          { type: 'baseType', id: 'weapon.staff', weight: 150 },
          { type: 'baseType', id: 'armor.heavy', weight: 150 },
          { type: 'baseType', id: 'relic', weight: 40 },
          { type: 'treasureClass', id: 'TC_GOLD_SMALL', weight: 500 }
        ]
      }
    });
  }

  async getTreasureClass(id: string) {
    if (this.db.models?.TreasureClass?.findOne) {
      const found = await this.db.models.TreasureClass.findOne({ id });
      if (found) return this.normalize(found);
    }

    return this.fallbackClasses[id] || this.fallbackClasses.TC_ACT1_BEAST;
  }

  normalize(tc: any) {
    return {
      id: String(tc.id),
      rolls: Math.max(1, Math.floor(Number(tc.rolls || 1))),
      noDropWeight: Math.max(0, Math.floor(Number(tc.noDropWeight || 0))),
      entries: Array.isArray(tc.entries) ? tc.entries : []
    };
  }

  async resolve(tcId: string, rng: any, depth = 0) {
    if (depth > 8) {
      throw new Error(`TREASURE_CLASS_RECURSION_LIMIT:${tcId}`);
    }

    const tc = await this.getTreasureClass(tcId);
    const results: any[] = [];

    for (let i = 0; i < tc.rolls; i++) {
      const candidates = [
        ...tc.entries,
        {
          type: 'noDrop',
          id: 'NO_DROP',
          weight: tc.noDropWeight
        }
      ].filter((x) => Number(x.weight) > 0);

      const picked = rng.weightedPick(candidates, 'weight');

      if (!picked || picked.type === 'noDrop') continue;

      if (picked.type === 'treasureClass') {
        const nested = await this.resolve(picked.id, rng, depth + 1);
        results.push(...nested);
        continue;
      }

      results.push(picked);
    }

    return results;
  }
}

export { TreasureClassRegistry };