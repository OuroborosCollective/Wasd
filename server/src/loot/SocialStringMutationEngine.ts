'use strict';

interface SocialMutation {
  id: string;
  titlePrefix: string;
  titleSuffix: string;
  loreTags: string[];
  biasStats: string[];
  forbiddenStats: string[];
  valueScalePermille: number;
}

class SocialStringMutationEngine {
  resolve({ rng, biomeId, factionId, socialString, playerReputation = 0 }: {
    rng: any;
    biomeId?: string;
    factionId?: string;
    socialString?: string;
    playerReputation?: number;
  }): SocialMutation {
    const tokens = this.tokenize(socialString);

    const mutation: SocialMutation = {
      id: 'neutral',
      titlePrefix: '',
      titleSuffix: '',
      loreTags: [],
      biasStats: [],
      forbiddenStats: [],
      valueScalePermille: 1000
    };

    if (biomeId === 'swamp') {
      mutation.id = 'swamp-adapted';
      mutation.titlePrefix = 'Mire';
      mutation.loreTags.push('biome:swamp');
      mutation.biasStats.push('poisonResist', 'vitality');
    }

    if (biomeId === 'mountain') {
      mutation.id = 'stonebound';
      mutation.titlePrefix = 'Stonebound';
      mutation.loreTags.push('biome:mountain');
      mutation.biasStats.push('armor', 'strength');
    }

    if (factionId === 'npc_kingdom_red') {
      mutation.titleSuffix = 'of the Red Banner';
      mutation.loreTags.push('faction:red');
      mutation.biasStats.push('damageMax');
    }

    if (tokens.has('betrayal')) {
      mutation.titleSuffix = 'of Broken Oaths';
      mutation.loreTags.push('social:betrayal');
      mutation.biasStats.push('criticalChance');
      mutation.forbiddenStats.push('healingPower');
    }

    if (tokens.has('protector')) {
      mutation.titleSuffix = 'of the Watch';
      mutation.loreTags.push('social:protector');
      mutation.biasStats.push('armor', 'vitality');
    }

    if (playerReputation >= 80) {
      mutation.loreTags.push('reputation:honored');
      mutation.valueScalePermille = 1050;
    }

    if (playerReputation <= -80) {
      mutation.loreTags.push('reputation:feared');
      mutation.biasStats.push('damageMin');
      mutation.valueScalePermille = 970;
    }

    // Small deterministic variants
    if (rng.int(1, 1000) <= 15) {
      mutation.loreTags.push('rare-social-echo');
      mutation.valueScalePermille += 25;
    }

    return Object.freeze(mutation);
  }

  mutateName(name: string, mutation: SocialMutation): string {
    let result = name;

    if (mutation.titlePrefix) {
      result = `${mutation.titlePrefix} ${result}`;
    }

    if (mutation.titleSuffix && !result.includes(mutation.titleSuffix)) {
      result = `${result} ${mutation.titleSuffix}`;
    }

    return result;
  }

  tokenize(input: string | undefined): Set<string> {
    if (!input || typeof input !== 'string') return new Set();

    return new Set(
      input
        .toLowerCase()
        .split(/[^a-z0-9_äöüß-]+/gi)
        .map((x) => x.trim())
        .filter(Boolean)
    );
  }
}

export { SocialStringMutationEngine };