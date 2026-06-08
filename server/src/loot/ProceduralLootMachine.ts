'use strict';

import { DeterministicRng } from './DeterministicRng';
import { LootAxioms } from './LootAxioms';
import { TreasureClassRegistry } from './TreasureClassRegistry';
import { RarityResolver } from './RarityResolver';
import { AffixEngine } from './AffixEngine';
import { SocialStringMutationEngine } from './SocialStringMutationEngine';
import { LootGovernor } from './LootGovernor';

interface LootContext {
  playerId: string;
  tickIndex: number;
  dropSourceId: string;
  lootIndex?: number;
  areaLevel: number;
  policyVersion?: string;
  treasureClassId?: string;
  magicFind?: number;
  killStreak?: number;
  sourceRank?: string;
  biomeId?: string;
  factionId?: string;
  socialString?: string;
  playerReputation?: number;
}

interface LootPolicy {
  version: string;
  maxMagicFind: number;
  maxAreaLevel: number;
  minAreaLevel: number;
}

class ProceduralLootMachine {
  private db: any;
  private policy: LootPolicy;
  private treasureClasses: TreasureClassRegistry;
  private rarityResolver: RarityResolver;
  private affixEngine: AffixEngine;
  private socialMutation: SocialStringMutationEngine;
  private governor: LootGovernor;

  constructor(db: any, policy: Partial<LootPolicy> = {}) {
    this.db = db;
    this.policy = {
      version: 'loot-policy-v3',
      maxMagicFind: 500,
      maxAreaLevel: 100,
      minAreaLevel: 1,
      ...policy
    };

    this.treasureClasses = new TreasureClassRegistry(db);
    this.rarityResolver = new RarityResolver(this.policy);
    this.affixEngine = new AffixEngine(db);
    this.socialMutation = new SocialStringMutationEngine();
    this.governor = new LootGovernor();
  }

  async generate(ctx: LootContext): Promise<{
    seedHash: string;
    context: any;
    items: readonly any[];
  }> {
    const context = this.normalizeContext(ctx);
    const seed = LootAxioms.makeSeed(context);
    const rng = new DeterministicRng(seed);

    const mutation = this.socialMutation.resolve({
      rng,
      biomeId: context.biomeId,
      factionId: context.factionId,
      socialString: context.socialString,
      playerReputation: context.playerReputation
    });

    const treasureResults = await this.treasureClasses.resolve(
      context.treasureClassId,
      rng
    );

    const items: any[] = [];

    for (let i = 0; i < treasureResults.length; i++) {
      const entry = treasureResults[i];

      if (entry.type === 'currency') {
        items.push(this.makeCurrency(entry, context, rng, i));
        continue;
      }

      if (entry.type === 'baseType') {
        const item = await this.makeItemFromBaseType({
          entry,
          context,
          rng,
          mutation,
          resultIndex: i,
          seed
        });

        items.push(item);
      }
    }

    return Object.freeze({
      seedHash: LootAxioms.shortHash(seed),
      context,
      items: Object.freeze(items)
    });
  }

  async makeItemFromBaseType({ entry, context, rng, mutation, resultIndex, seed }: {
    entry: any;
    context: any;
    rng: any;
    mutation: any;
    resultIndex: number;
    seed: string;
  }): Promise<any> {
    const baseItem = await this.resolveBaseItem(entry.id, context.areaLevel, rng);

    const rarity = this.rarityResolver.resolve({
      rng,
      magicFind: context.magicFind,
      killStreak: context.killStreak,
      sourceRank: context.sourceRank
    });

    const affixes = await this.affixEngine.rollAffixes({
      rng,
      rarity,
      areaLevel: context.areaLevel,
      baseType: baseItem.type,
      socialMutation: mutation
    });

    const attributes = this.mergeAttributes(baseItem.baseStats || {}, affixes);
    const rawName = this.constructName(baseItem.name, affixes, rarity);
    const mutatedName = this.socialMutation.mutateName(rawName, mutation);

    const item = Object.freeze({
      uid: this.makeUid(seed, resultIndex, baseItem.id || baseItem.name, rarity.id, affixes),
      kind: 'item',
      name: mutatedName,
      baseId: baseItem.id || null,
      baseType: baseItem.type,
      rarity: rarity.id,
      itemLevel: context.areaLevel,
      attributes,
      affixes,
      socialMutation: mutation,
      requirements: Object.freeze({
        level: Math.max(1, context.areaLevel - 5),
        strength: Math.floor(Number(baseItem.reqStr || 0)),
        intelligence: Math.floor(Number(baseItem.reqInt || 0)),
        dexterity: Math.floor(Number(baseItem.reqDex || 0))
      }),
      visuals: Object.freeze({
        icon: baseItem.icon || 'icons/items/fallback.png',
        color: this.colorForRarity(rarity.id)
      }),
      economy: Object.freeze({
        sellValue: this.calculateValue(rarity.id, context.areaLevel, affixes.length),
        bindOnPickup: rarity.id === 'LEGENDARY' || rarity.id === 'MYTHIC'
      }),
      meta: Object.freeze({
        policyVersion: context.policyVersion,
        tickIndex: context.tickIndex,
        dropSourceId: context.dropSourceId,
        lootIndex: context.lootIndex,
        resultIndex,
        axiomVersion: LootAxioms.VERSION
      })
    });

    const inspection = this.governor.inspect(item);

    if (!inspection.ok) {
      return this.governor.sanitize({
        ...item,
        governorWarnings: inspection.warnings
      });
    }

    return item;
  }

  makeCurrency(entry: any, context: any, rng: any, resultIndex: number): any {
    const amount = rng.int(
      Math.floor(Number(entry.min || 1)),
      Math.floor(Number(entry.max || 1))
    );

    return Object.freeze({
      uid: this.makeUid(
        LootAxioms.makeSeed(context),
        resultIndex,
        entry.id,
        'CURRENCY',
        [{ id: entry.id, value: amount }]
      ),
      kind: 'currency',
      currency: entry.id,
      amount,
      meta: Object.freeze({
        tickIndex: context.tickIndex,
        dropSourceId: context.dropSourceId,
        resultIndex
      })
    });
  }

  async resolveBaseItem(baseType: string, areaLevel: number, rng: any): Promise<any> {
    let bases: any[] = [];

    if (this.db.models?.ItemBase?.find) {
      bases = await this.db.models.ItemBase.find({
        type: baseType,
        minLevel: { $lte: areaLevel },
        maxLevel: { $gte: areaLevel }
      });
    }

    if (!Array.isArray(bases) || bases.length === 0) {
      bases = [{
        id: `fallback-${baseType}`,
        name: baseType.includes('sword') ? 'Iron Sword' : 'Wanderer Gear',
        type: baseType,
        minLevel: 1,
        maxLevel: 999,
        reqStr: 0,
        reqInt: 0,
        reqDex: 0,
        icon: 'icons/items/fallback.png',
        baseStats: baseType.includes('weapon')
          ? { damageMin: 2, damageMax: 5, durability: 30 }
          : { armor: 2, durability: 30 }
      }];
    }

    bases = bases.sort((a, b) => String(a.id || a.name).localeCompare(String(b.id || b.name)));

    return rng.pick(bases);
  }

  mergeAttributes(baseStats: any, affixes: any[]): any {
    const stats: Record<string, number> = {};

    for (const key of Object.keys(baseStats).sort()) {
      stats[key] = Math.floor(Number(baseStats[key] || 0));
    }

    for (const affix of affixes) {
      stats[affix.stat] = Math.floor(Number(stats[affix.stat] || 0)) + affix.value;
    }

    return Object.freeze(stats);
  }

  constructName(baseName: string, affixes: any[], rarity: any): string {
    if (rarity.id === 'COMMON' || affixes.length === 0) return baseName;

    const prefix = affixes
      .filter((a) => a.isPrefix)
      .map((a) => a.name)
      .sort()[0];

    const suffix = affixes
      .filter((a) => !a.isPrefix)
      .map((a) => a.name)
      .sort()[0];

    let name = baseName;

    if (prefix) name = `${prefix} ${name}`;
    if (suffix) name = `${name} of ${suffix}`;

    if (rarity.id === 'MYTHIC') {
      name = `${name}, Axiom-Bound`;
    }

    return name;
  }

  calculateValue(rarity: string, level: number, affixCount: number): number {
    const mult: Record<string, number> = {
      COMMON: 1,
      MAGIC: 3,
      RARE: 8,
      EPIC: 20,
      LEGENDARY: 100,
      MYTHIC: 350
    };

    return Math.max(1, Math.round(level * 10 * (mult[rarity] || 1) * (1 + affixCount * 0.2)));
  }

  colorForRarity(rarity: string): string {
    const colors: Record<string, string> = {
      COMMON: '#9da1aa',
      MAGIC: '#3498db',
      RARE: '#f1c40f',
      EPIC: '#9b59b6',
      LEGENDARY: '#e67e22',
      MYTHIC: '#ff3355'
    };

    return colors[rarity] || '#ffffff';
  }

  makeUid(seed: string, resultIndex: number, baseId: string, rarity: string, affixes: any[]): string {
    const sig = JSON.stringify({
      seed,
      resultIndex,
      baseId,
      rarity,
      affixes: affixes.map((a) => [a.id, a.value]).sort()
    });

    return `item-${LootAxioms.shortHash(sig, 32)}`;
  }

  normalizeContext(ctx: LootContext): any {
    const areaLevel = Math.max(
      this.policy.minAreaLevel,
      Math.min(this.policy.maxAreaLevel, Math.floor(Number(ctx.areaLevel || 1)))
    );

    return Object.freeze({
      playerId: String(ctx.playerId),
      tickIndex: Math.floor(Number(ctx.tickIndex)),
      dropSourceId: String(ctx.dropSourceId),
      lootIndex: Math.floor(Number(ctx.lootIndex || 0)),
      areaLevel,
      policyVersion: String(ctx.policyVersion || this.policy.version),
      treasureClassId: String(ctx.treasureClassId || 'TC_ACT1_BEAST'),
      magicFind: Math.floor(Number(ctx.magicFind || 0)),
      killStreak: Math.floor(Number(ctx.killStreak || 0)),
      sourceRank: String(ctx.sourceRank || 'NORMAL'),
      biomeId: String(ctx.biomeId || 'unknown'),
      factionId: String(ctx.factionId || 'neutral'),
      socialString: String(ctx.socialString || ''),
      playerReputation: Math.floor(Number(ctx.playerReputation || 0))
    });
  }
}

export { ProceduralLootMachine };