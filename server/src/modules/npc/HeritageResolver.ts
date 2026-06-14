/**
 * HeritageResolver - Deterministic Heritage Resolution
 * 
 * Provides deterministic heritage resolution for NPCs based on:
 * - Culture
 * - Religion
 * - House affiliation
 * 
 * All results are deterministic based on input parameters.
 */

export interface HeritageContext {
  culture: string;
  religion: string;
  house: string;
  lineageHash?: string;
  tick?: number;
}

export interface HeritageResult {
  culture: string;
  religion: string;
  house: string;
  heritageKey: string;
  cultureTraits: string[];
  religionTraits: string[];
  houseTraits: string[];
  tick?: number;
}

// Cultural trait mappings (deterministic)
const CULTURE_TRAITS: Record<string, string[]> = {
  northern: ['hardy', 'honorable', 'warrior'],
  southern: ['diplomatic', 'trader', 'artistic'],
  eastern: ['scholarly', 'mystical', 'disciplined'],
  western: ['independent', 'pragmatic', 'nomadic'],
  default: ['adaptable', 'resourceful', 'resilient'],
};

// Religion trait mappings (deterministic)
const RELIGION_TRAITS: Record<string, string[]> = {
  nature: ['nature_worship', 'peaceful', 'healer'],
  war: ['martial', 'brave', 'disciplined'],
  knowledge: ['scholarly', 'wise', 'curious'],
  trade: ['greedy', 'charitable', 'social'],
  death: ['morbid', 'wise', 'feared'],
  default: ['pious', 'devoted', 'faithful'],
};

export class HeritageResolver {
  /**
   * Resolve heritage deterministically from culture, religion, and house.
   * Same inputs always produce same outputs.
   */
  resolve(culture: string, religion: string, house: string, lineageHash?: string, tick?: number): HeritageResult {
    const cultureLower = culture.toLowerCase();
    const religionLower = religion.toLowerCase();

    // Get deterministic traits
    const cultureTraits = CULTURE_TRAITS[cultureLower] ?? CULTURE_TRAITS.default;
    const religionTraits = RELIGION_TRAITS[religionLower] ?? RELIGION_TRAITS.default;
    
    // House traits are derived from house name hash (deterministic)
    const houseTraits = this.deriveHouseTraits(house, lineageHash);

    return {
      culture,
      religion,
      house,
      heritageKey: this.computeHeritageKey(cultureLower, religionLower, house),
      cultureTraits,
      religionTraits,
      houseTraits,
      tick,
    };
  }

  /**
   * Compute deterministic heritage key from inputs.
   */
  private computeHeritageKey(culture: string, religion: string, house: string): string {
    // Simple deterministic key - same inputs = same key
    return `${culture}:${religion}:${house}`.toLowerCase();
  }

  /**
   * Derive house traits deterministically from house name and optional lineage hash.
   */
  private deriveHouseTraits(house: string, lineageHash?: string): string[] {
    const traits: string[] = [];
    
    // Base trait from house name length (deterministic)
    const len = house.length;
    if (len % 3 === 0) traits.push('noble');
    else if (len % 3 === 1) traits.push('ancient');
    else traits.push('proud');

    // Additional trait from first letter (deterministic)
    const firstChar = house.charCodeAt(0);
    if (firstChar < 78) traits.push('wealthy');  // A-M
    else traits.push('influential');  // N-Z

    // Lineage-based trait if hash provided
    if (lineageHash) {
      const hashSum = this.sumHash(lineageHash);
      if (hashSum % 2 === 0) traits.push('prestigious');
      else traits.push('ambitious');
    }

    return traits;
  }

  /**
   * Sum hash characters for deterministic modulo operations.
   */
  private sumHash(hash: string): number {
    let sum = 0;
    for (let i = 0; i < hash.length; i++) {
      sum += hash.charCodeAt(i);
    }
    return sum;
  }
}