/**
 * FactionLegacyEngine - NPC Trait Inheritance from World Legends
 * 
 * Extends NPCGenealogyEngine to influence newborn NPC traits (faith, aggression)
 * based on cumulative legend intensities from WorldHistory.
 * 
 * DETERMINISTIC: No floating point drift - Integer scaling only.
 * STATELESS: Same legend state → same traits.
 */

import { NPCGenealogyEngine } from './NPCGenealogyEngine';
import { WorldHistory, Legend } from '../ouroboros/WorldHistory.js';

/** Integer scale factor - prevents floating point drift */
const TRAIT_SCALE = 10000;

/** Trait intensity modifiers (scaled by TRAIT_SCALE) */
const MODIFIER = {
  HEROIC_VICTORY: { faith: 0, aggression: 1500 },      // +0.15
  DIVINE_INTERVENTION: { faith: 2500, aggression: 0 },    // +0.25
  GREAT_BETRAYAL: { faith: -2000, aggression: 1000 },   // -0.20, +0.10
  CULTURAL_FOUNDING: { faith: 1000, aggression: 500 },    // +0.10, +0.05
  ANCIENT_WAR: { faith: -500, aggression: 2000 },        // -0.05, +0.20
};

/** NPC faction stats (integer-scaled) */
export interface IFactionStats {
  faith: number;       // Scaled by TRAIT_SCALE
  aggression: number; // Scaled by TRAIT_SCALE
  [key: string]: number;
}

/** Legend data from AREPayload */
export interface LegendIntensity {
  type: string;
  intensity: number;  // Already scaled
  count: number;
}

/**
 * Calculate cumulative legend intensities for a faction.
 * STATELESS: Same input = Same output.
 */
export function calculateLegendIntensities(
  legends: Legend[],
  factionId: string
): LegendIntensity[] {
  const intensityMap = new Map<string, { intensity: number; count: number }>();
  
  // Group legends by type and sum intensities
  for (const legend of legends) {
    if (!legend.impactScore) continue;
    
    const existing = intensityMap.get(legend.type) || { intensity: 0, count: 0 };
    existing.intensity += Math.floor(legend.impactScore * TRAIT_SCALE);
    existing.count += 1;
    intensityMap.set(legend.type, existing);
  }
  
  // Convert to array
  const result: LegendIntensity[] = [];
  intensityMap.forEach((value, type) => {
    result.push({ type, intensity: value.intensity, count: value.count });
  });
  
  return result;
}

/**
 * Apply legend modifiers to base stats.
 * DETERMINISTIC: Pure function - no side effects.
 */
export function applyLegendModifiers(
  baseStats: IFactionStats,
  legends: LegendIntensity[]
): IFactionStats {
  let faith = baseStats.faith;
  let aggression = baseStats.aggression;
  
  for (const legend of legends) {
    const mod = MODIFIER[legend.type as keyof typeof MODIFIER];
    if (mod) {
      // Scale modifier by legend count
      const countFactor = Math.floor(legend.count * TRAIT_SCALE) / TRAIT_SCALE;
      faith += Math.floor(mod.faith * countFactor);
      aggression += Math.floor(mod.aggression * countFactor);
    }
  }
  
  // Clamp to valid range [0, TRAIT_SCALE]
  faith = Math.max(0, Math.min(TRAIT_SCALE, faith));
  aggression = Math.max(0, Math.min(TRAIT_SCALE, aggression));
  
  return { faith, aggression };
}

/**
 * Convert scaled trait to external (0-1 range)
 */
export function toExternalTrait(scaledValue: number): number {
  return scaledValue / TRAIT_SCALE;
}

/**
 * Convert external trait to scaled (integer)
 */
export function toScaledTrait(externalValue: number): number {
  return Math.floor(externalValue * TRAIT_SCALE);
}

export class FactionLegacyEngine extends NPCGenealogyEngine {
  private worldHistory: WorldHistory;

  constructor(worldHistory: WorldHistory) {
    super();
    this.worldHistory = worldHistory;
  }

  /**
   * Generate legacy stats for newborn NPCs within a faction.
   * DETERMINISTIC: Stateless - same legends produce same stats.
   */
  public generateLegacyStats(
    factionId: string,
    baseStats: IFactionStats
  ): IFactionStats {
    // Get legends for faction
    const legends = this.worldHistory.getLegends() || [];
    const factionLegends = legends.filter(
      (l: Legend) => l.regionId === factionId || !l.regionId
    );
    
    // Calculate cumulative intensities
    const intensities = calculateLegendIntensities(factionLegends, factionId);
    
    // Apply modifiers
    return applyLegendModifiers(baseStats, intensities);
  }

  /**
   * Generate legacy stats from explicit legendary intensity data.
   * Enables stateless/proof testing.
   */
  public generateLegacyStatsFromData(
    intensities: LegendIntensity[],
    baseStats: IFactionStats
  ): IFactionStats {
    if (!intensities || intensities.length === 0) {
      return { ...baseStats };
    }
    
    return applyLegendModifiers(baseStats, intensities);
  }

  /**
   * Get legend intensity summary for a faction.
   * Returns cumulative intensities by type.
   */
  public getLegendSummary(factionId: string): LegendIntensity[] {
    const legends = this.worldHistory.getLegends() || [];
    const factionLegends = legends.filter(
      (l: Legend) => l.regionId === factionId || !l.regionId
    );
    
    return calculateLegendIntensities(factionLegends, factionId);
  }
}

export default FactionLegacyEngine;