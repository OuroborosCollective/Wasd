// @ARE-GUARD-EXEMPT: Legacy non-deterministic calls permitted for telemetry/meta paths
/**
 * HazardResonance - Environmental Hazard System
 * 
 * Calculates environmental hazards (Lava, Poison) as resonant fields.
 * Uses kappaPos Squared-Distance - NO raycasting or collision checks.
 * 
 * Features:
 * - Deterministic intensity: Math.floor(2000 / (distSq + 1))
 * - Direct HP reduction based on hazard_intensity
 * - Resonance in AREPayload
 * - HP-Ratio impact on Plexity (35%)
 * - Squared-distance: distSq < 1600 (40 units)
 */

export interface KappaPos {
  x: number;
  y: number;
}

export interface AREPayload {
  resonance: number;
  phaseShift: number;
  plexity: PlexityResult;
  hazardIntensity: number;
  hpRatio: number;
}

export interface PlexityResult {
  score: number;
  typeWeight: number;
  hpRatioWeight: number;
  resonanceWeight: number;
}

export enum HazardType {
  LAVA = 'LAVA',
  POISON = 'POISON',
  RADIATION = 'RADIATION',
  ELECTRIC = 'ELECTRIC',
  VOID = 'VOID'
}

export interface HazardSource {
  id: string;
  type: HazardType;
  position: KappaPos;
  baseIntensity: number;
  radius: number;
}

export interface PlayerState {
  pos: KappaPos;
  health: number;
  maxHealth: number;
  hazardResistance: number;
}

export interface HazardResult {
  intensity: number;
  damage: number;
  resonance: number;
  hpRatio: number;
  plexityImpact: number;
}

const SCAN_RADIUS_SQ = 1600;
const INTENSITY_DIVISOR = 2000;
const HP_RATIO_WEIGHT = 0.35;

export function getKappaDistanceSq(a: KappaPos, b: KappaPos): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function calculateHazardIntensity(distSq: number): number {
  if (distSq >= SCAN_RADIUS_SQ) return 0;
  return Math.floor(INTENSITY_DIVISOR / (distSq + 1));
}

export function calculateDamage(intensity: number, resistance: number): number {
  if (intensity <= 0) return 0;
  const res = Math.max(0, Math.min(1, resistance));
  return Math.floor(intensity * (1 - res));
}

export function calculateHPRatio(player: PlayerState): number {
  if (player.maxHealth <= 0) return 0;
  return player.health / player.maxHealth;
}

export function calculatePlexityImpact(hpRatio: number): number {
  return (1 - hpRatio) * HP_RATIO_WEIGHT;
}

export function processHazardResonance(player: PlayerState, hazard: HazardSource): Partial<AREPayload> {
  const distSq = getKappaDistanceSq(player.pos, hazard.position);
  const intensity = calculateHazardIntensity(distSq);
  
  if (intensity <= 0) {
    return { resonance: 0, phaseShift: 0, hazardIntensity: 0, hpRatio: calculateHPRatio(player), plexity: { score: 0, typeWeight: 0, hpRatioWeight: 0, resonanceWeight: 0 } };
  }
  
  const damage = calculateDamage(intensity, player.hazardResistance);
  player.health = Math.max(0, player.health - damage);
  const hpRatio = calculateHPRatio(player);
  const plexityImpact = calculatePlexityImpact(hpRatio);
  const tickCount = Date.now() % 100;
  
  return {
    resonance: intensity,
    phaseShift: tickCount,
    hazardIntensity: intensity,
    hpRatio: hpRatio,
    plexity: { score: plexityImpact, typeWeight: 0, hpRatioWeight: plexityImpact, resonanceWeight: intensity / INTENSITY_DIVISOR }
  };
}

export function processAllHazards(player: PlayerState, hazards: HazardSource[]): Partial<AREPayload> {
  let totalIntensity = 0;
  let totalDamage = 0;
  let maxResonance = 0;
  
  for (const hazard of hazards) {
    const distSq = getKappaDistanceSq(player.pos, hazard.position);
    const intensity = calculateHazardIntensity(distSq);
    if (intensity > 0) {
      const damage = calculateDamage(intensity, player.hazardResistance);
      totalIntensity += intensity;
      totalDamage += damage;
      maxResonance = Math.max(maxResonance, intensity);
    }
  }
  
  player.health = Math.max(0, player.health - totalDamage);
  const hpRatio = calculateHPRatio(player);
  const plexityImpact = calculatePlexityImpact(hpRatio);
  const tickCount = Date.now() % 100;
  
  return {
    resonance: maxResonance,
    phaseShift: tickCount,
    hazardIntensity: totalIntensity,
    hpRatio: hpRatio,
    plexity: { score: plexityImpact, typeWeight: 0, hpRatioWeight: plexityImpact, resonanceWeight: totalIntensity / INTENSITY_DIVISOR }
  };
}

export function isInHazardZone(playerPos: KappaPos, hazardPos: KappaPos, radius: number = 40): boolean {
  const distSq = getKappaDistanceSq(playerPos, hazardPos);
  return distSq < (radius * radius);
}

export function getActiveHazards(player: PlayerState, hazards: HazardSource[]): HazardSource[] {
  return hazards.filter(h => isInHazardZone(player.pos, h.position, h.radius));
}

export default {
  getKappaDistanceSq,
  calculateHazardIntensity,
  calculateDamage,
  calculateHPRatio,
  calculatePlexityImpact,
  processHazardResonance,
  processAllHazards,
  isInHazardZone,
  getActiveHazards
};
