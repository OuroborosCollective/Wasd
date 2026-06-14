/**
 * Stable Target Selection - Deterministic Target Selection Utility
 * 
 * Provides stable, deterministic target selection for NPC/Monster activities.
 * Same input always produces same output - critical for ARE compliance.
 * 
 * Tie-breaker order:
 * 1. Distance (primary) - closest targets preferred
 * 2. Entity ID hash (secondary) - stable alphabetical tie-breaker
 * 3. Spawn ID/hash (tertiary) - deterministic spawn order
 */

import { stableHash32 } from "../../core/determinism/AREDeterminism.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Target candidate with deterministic ordering values
 */
export interface TargetCandidate {
  id: string;
  position: { x: number; y: number };
  type: "player" | "npc" | "monster";
  /** Distance from source entity - used as primary sort key */
  distance: number;
  /** Secondary sort: stable hash of id for tie-breaking */
  idHash: number;
  /** Optional spawn hash for tertiary tie-breaking */
  spawnHash?: number;
}

/**
 * Target selection result
 */
export interface SelectedTarget {
  id: string | null;
  position?: { x: number; y: number };
  distance: number;
  /** Tie-breaker info for debugging */
  tieBreaker?: string;
}

/**
 * Target filter options
 */
export interface TargetFilterOptions {
  /** Filter by entity type */
  types?: Array<"player" | "npc" | "monster">;
  /** Maximum distance to consider */
  maxDistance?: number;
  /** Minimum distance to consider */
  minDistance?: number;
  /** Filter out specific entity IDs */
  excludeIds?: Set<string>;
  /** Filter by hostile status */
  hostileOnly?: boolean;
  /** Filter by friendly status */
  friendlyOnly?: boolean;
}

// ============================================================================
// Core Selection Functions
// ============================================================================

/**
 * Select stable target from candidates
 * Deterministic: same candidates + position = same target
 * 
 * @param candidates - List of target candidates
 * @param sourcePosition - Position of the entity selecting target
 * @returns Selected target with stable tie-breaking
 */
export function selectStableTarget(
  candidates: TargetCandidate[],
  sourcePosition: { x: number; y: number }
): SelectedTarget {
  // Filter and sort candidates deterministically
  const sortedCandidates = getSortedCandidates(candidates, sourcePosition);
  
  if (sortedCandidates.length === 0) {
    return {
      id: null,
      distance: Infinity,
    };
  }
  
  const selected = sortedCandidates[0]!;
  
  return {
    id: selected.id,
    position: selected.position,
    distance: selected.distance,
    tieBreaker: `distance:${selected.distance.toFixed(2)},hash:${selected.idHash.toString(16)}`,
  };
}

/**
 * Select best attack target with additional constraints
 * Prefers players, then considers distance and type
 */
export function selectAttackTarget(
  candidates: TargetCandidate[],
  sourcePosition: { x: number; y: number }
): SelectedTarget {
  // Separate by type for priority
  const players = candidates.filter(c => c.type === "player");
  const npcs = candidates.filter(c => c.type === "npc");
  const monsters = candidates.filter(c => c.type === "monster");
  
  // Try players first (deterministic within each group)
  if (players.length > 0) {
    const sortedPlayers = getSortedCandidates(players, sourcePosition);
    const selected = sortedPlayers[0]!;
    return {
      id: selected.id,
      position: selected.position,
      distance: selected.distance,
      tieBreaker: `type:player,distance:${selected.distance.toFixed(2)},hash:${selected.idHash.toString(16)}`,
    };
  }
  
  // Then NPCs
  if (npcs.length > 0) {
    const sortedNpcs = getSortedCandidates(npcs, sourcePosition);
    const selected = sortedNpcs[0]!;
    return {
      id: selected.id,
      position: selected.position,
      distance: selected.distance,
      tieBreaker: `type:npc,distance:${selected.distance.toFixed(2)},hash:${selected.idHash.toString(16)}`,
    };
  }
  
  // Finally monsters (usually other monsters shouldn't fight each other)
  if (monsters.length > 0) {
    const sortedMonsters = getSortedCandidates(monsters, sourcePosition);
    const selected = sortedMonsters[0]!;
    return {
      id: selected.id,
      position: selected.position,
      distance: selected.distance,
      tieBreaker: `type:monster,distance:${selected.distance.toFixed(2)},hash:${selected.idHash.toString(16)}`,
    };
  }
  
  return {
    id: null,
    distance: Infinity,
  };
}

/**
 * Select closest target within range
 */
export function selectClosestTarget(
  candidates: TargetCandidate[],
  sourcePosition: { x: number; y: number },
  options?: TargetFilterOptions
): SelectedTarget {
  let filtered = candidates;
  
  // Apply filters
  if (options?.types && options.types.length > 0) {
    const typeSet = new Set(options.types);
    filtered = filtered.filter(c => typeSet.has(c.type));
  }
  
  if (options?.excludeIds && options.excludeIds.size > 0) {
    filtered = filtered.filter(c => !options.excludeIds.has(c.id));
  }
  
  if (options?.minDistance !== undefined) {
    filtered = filtered.filter(c => c.distance >= options.minDistance!);
  }
  
  if (options?.maxDistance !== undefined) {
    filtered = filtered.filter(c => c.distance <= options.maxDistance!);
  }
  
  // Get sorted and return closest
  const sorted = getSortedCandidates(filtered, sourcePosition);
  
  if (sorted.length === 0) {
    return {
      id: null,
      distance: Infinity,
    };
  }
  
  const selected = sorted[0]!;
  return {
    id: selected.id,
    position: selected.position,
    distance: selected.distance,
    tieBreaker: `closest,distance:${selected.distance.toFixed(2)},hash:${selected.idHash.toString(16)}`,
  };
}

/**
 * Select safest target (furthest from threats)
 */
export function selectSafestTarget(
  candidates: TargetCandidate[],
  sourcePosition: { x: number; y: number },
  threats: Array<{ position: { x: number; y: number } }>
): SelectedTarget {
  if (candidates.length === 0) {
    return {
      id: null,
      distance: Infinity,
    };
  }
  
  // Score each candidate by safety (distance from threats)
  const scoredCandidates = candidates.map(candidate => {
    let minThreatDistance = Infinity;
    
    for (const threat of threats) {
      const threatDist = calculateDistance(candidate.position, threat.position);
      if (threatDist < minThreatDistance) {
        minThreatDistance = threatDist;
      }
    }
    
    // Combine: prefer further from threats AND closer to self (balanced)
    const safetyScore = minThreatDistance;
    const proximityScore = candidate.distance;
    
    // Lower is better: close to self, far from threats
    const combinedScore = safetyScore - proximityScore * 0.1;
    
    return {
      candidate,
      safetyScore,
      combinedScore,
    };
  });
  
  // Sort by combined score (lower is better)
  scoredCandidates.sort((a, b) => {
    if (a.combinedScore !== b.combinedScore) {
      return a.combinedScore - b.combinedScore;
    }
    // Tie-breaker: use id hash
    return a.candidate.idHash - b.candidate.idHash;
  });
  
  const selected = scoredCandidates[0]!.candidate;
  return {
    id: selected.id,
    position: selected.position,
    distance: selected.distance,
    tieBreaker: `safest,safety:${scoredCandidates[0]!.safetyScore.toFixed(2)},hash:${selected.idHash.toString(16)}`,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sort candidates deterministically
 * Primary: distance (ascending)
 * Secondary: idHash (ascending) for stable tie-breaking
 * Tertiary: spawnHash (ascending) if available
 */
function getSortedCandidates(
  candidates: TargetCandidate[],
  sourcePosition: { x: number; y: number }
): TargetCandidate[] {
  // Ensure we have idHash for all candidates
  const candidatesWithHash = candidates.map(c => ({
    ...c,
    distance: c.distance > 0 ? c.distance : calculateDistance(sourcePosition, c.position),
    idHash: c.idHash > 0 ? c.idHash : stableHash32(c.id),
  }));
  
  // Sort deterministically
  return [...candidatesWithHash].sort((a, b) => {
    // Primary: distance ascending (closer first)
    if (a.distance !== b.distance) {
      return a.distance - b.distance;
    }
    
    // Secondary: idHash ascending (stable tie-breaker)
    if (a.idHash !== b.idHash) {
      return a.idHash - b.idHash;
    }
    
    // Tertiary: spawnHash ascending (if available)
    const aSpawn = a.spawnHash ?? 0;
    const bSpawn = b.spawnHash ?? 0;
    if (aSpawn !== bSpawn) {
      return aSpawn - bSpawn;
    }
    
    // Final fallback: alphabetical by id
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * Calculate distance between two positions
 */
function calculateDistance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Create target candidate from raw data
 */
export function createTargetCandidate(
  id: string,
  position: { x: number; y: number },
  type: "player" | "npc" | "monster",
  sourcePosition: { x: number; y: number },
  spawnHash?: number
): TargetCandidate {
  return {
    id,
    position,
    type,
    distance: calculateDistance(sourcePosition, position),
    idHash: stableHash32(id),
    spawnHash,
  };
}

/**
 * Batch create candidates from array
 */
export function createTargetCandidates(
  entities: Array<{
    id: string;
    position: { x: number; y: number };
    type: "player" | "npc" | "monster";
    spawnHash?: number;
  }>,
  sourcePosition: { x: number; y: number }
): TargetCandidate[] {
  return entities.map(e => createTargetCandidate(e.id, e.position, e.type, sourcePosition, e.spawnHash));
}

// ============================================================================
// Verification Functions
// ============================================================================

/**
 * Verify target selection is deterministic
 * Same input should always produce same output
 */
export function verifyTargetSelectionDeterminism(
  candidates: TargetCandidate[],
  sourcePosition: { x: number; y: number },
  iterations = 10
): boolean {
  const results: SelectedTarget[] = [];
  
  for (let i = 0; i < iterations; i++) {
    results.push(selectStableTarget(candidates, sourcePosition));
  }
  
  // All results should be identical
  const first = results[0];
  for (const result of results) {
    if (result.id !== first.id || result.distance !== first.distance) {
      return false;
    }
  }
  
  return true;
}