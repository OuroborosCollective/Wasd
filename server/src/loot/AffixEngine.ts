'use strict';

interface Affix {
  id: string;
  name: string;
  stat: string;
  type: string;
  minRoll: number;
  maxRoll: number;
  requiredLevel: number;
  group: string;
  isPrefix: boolean;
  weight: number;
}

class AffixEngine {
  private db: any;
  private readonly fallbackAffixes: readonly Affix[];

  constructor(db: any) {
    this.db = db;

    this.fallbackAffixes = Object.freeze([
      {
        id: 'pre_vital',
        name: 'Vital',
        stat: 'vitality',
        type: 'flat',
        minRoll: 2,
        maxRoll: 8,
        requiredLevel: 1,
        group: 'core_vitality',
        isPrefix: true,
        weight: 120
      },
      {
        id: 'pre_savage',
        name: 'Savage',
        stat: 'damageMax',
        type: 'flat',
        minRoll: 1,
        maxRoll: 6,
        requiredLevel: 1,
        group: 'damage_flat',
        isPrefix: true,
        weight: 100
      },
      {
        id: 'suf_bear',
        name: 'the Bear',
        stat: 'strength',
        type: 'flat',
        minRoll: 2,
        maxRoll: 9,
        requiredLevel: 1,
        group: 'core_strength',
        isPrefix: false,
        weight: 100
      },
      {
        id: 'suf_owl',
        name: 'the Owl',
        stat: 'intelligence',
        type: 'flat',
        minRoll: 2,
        maxRoll: 9,
        requiredLevel: 1,
        group: 'core_intelligence',
        isPrefix: false,
        weight: 100
      },
      {
        id: 'pre_ouroboric',
        name: 'Ouroboric',
        stat: 'resonance',
        type: 'flat',
        minRoll: 1,
        maxRoll: 5,
        requiredLevel: 10,
        group: 'are_resonance',
        isPrefix: true,
        weight: 20
      }
    ]);
  }

  async loadAffixPool(areaLevel: number, baseType: string): Promise<Affix[]> {
    let affixes: Affix[] = [];

    if (this.db.models?.AffixPool?.find) {
      affixes = await this.db.models.AffixPool.find({
        requiredLevel: { $lte: areaLevel },
        $or: [
          { baseTypes: { $exists: false } },
          { baseTypes: baseType }
        ]
      });
    }

    if (!Array.isArray(affixes) || affixes.length === 0) {
      affixes = this.fallbackAffixes.filter((a) => a.requiredLevel <= areaLevel);
    }

    return affixes
      .filter((a) => this.isValid(a))
      .sort((a, b) => String(a.id || a.name).localeCompare(String(b.id || b.name)));
  }

  async rollAffixes({ rng, rarity, areaLevel, baseType, socialMutation }: {
    rng: any;
    rarity: any;
    areaLevel: number;
    baseType: string;
    socialMutation?: any;
  }) {
    const [minAffixes, maxAffixes] = rarity.affixRange;
    const count = rng.int(minAffixes, maxAffixes);

    if (count <= 0) return [];

    const pool = await this.loadAffixPool(areaLevel, baseType);
    const selected: any[] = [];
    const blockedGroups = new Set<string>();

    let prefixCount = 0;
    let suffixCount = 0;

    for (let i = 0; i < count; i++) {
      const candidates = pool.filter((affix) => {
        const group = affix.group || affix.stat || affix.id;
        if (blockedGroups.has(group)) return false;

        if (affix.isPrefix && prefixCount >= Math.ceil(count / 2)) return false;
        if (!affix.isPrefix && suffixCount >= Math.ceil(count / 2)) return false;

        return true;
      });

      if (candidates.length === 0) break;

      const weighted = candidates.map((affix) => ({
        ...affix,
        weight: this.applySocialWeight(affix, socialMutation)
      }));

      const picked = rng.weightedPick(weighted, 'weight');
      if (!picked) break;

      blockedGroups.add(picked.group || picked.stat || picked.id);
      if (picked.isPrefix) prefixCount++;
      else suffixCount++;

      selected.push(this.rollValue(picked, areaLevel, rng, socialMutation));
    }

    return selected;
  }

  applySocialWeight(affix: Affix, socialMutation: any): number {
    let weight = Math.max(1, Math.floor(Number(affix.weight || 1)));

    if (!socialMutation) return weight;

    if (socialMutation.biasStats?.includes(affix.stat)) {
      weight = Math.floor(weight * 1.35);
    }

    if (socialMutation.forbiddenStats?.includes(affix.stat)) {
      weight = Math.floor(weight * 0.25);
    }

    return Math.max(1, weight);
  }

  rollValue(affix: Affix, areaLevel: number, rng: any, socialMutation?: any): any {
    const min = Math.floor(Number(affix.minRoll || 0));
    const max = Math.max(min, Math.floor(Number(affix.maxRoll || min)));
    const raw = rng.int(min, max);

    let scalePermille = 1000 + areaLevel * 100;

    if (socialMutation?.valueScalePermille) {
      scalePermille = Math.floor((scalePermille * socialMutation.valueScalePermille) / 1000);
    }

    return Object.freeze({
      id: String(affix.id || affix.name),
      name: String(affix.name),
      stat: String(affix.stat),
      type: String(affix.type || 'flat'),
      value: Math.max(0, Math.round((raw * scalePermille) / 1000)),
      rawRoll: raw,
      group: String(affix.group || affix.stat),
      isPrefix: Boolean(affix.isPrefix)
    });
  }

  isValid(affix: any): boolean {
    if (!affix) return false;
    if (!affix.name || !affix.stat) return false;

    const min = Number(affix.minRoll);
    const max = Number(affix.maxRoll);

    return Number.isFinite(min) && Number.isFinite(max) && max >= min;
  }
}

export { AffixEngine };