import { stableHash32 } from "../core/determinism/AREDeterminism.js";

export interface TargetCandidate {
  id: string;
  position: { x: number; y: number };
  type: "player" | "npc" | "monster";
  distance: number;
  idHash: number;
  spawnHash?: number;
}

export interface SelectedTarget {
  id: string | null;
  position?: { x: number; y: number };
  distance: number;
  tieBreaker?: string;
}

export interface TargetFilterOptions {
  types?: Array<"player" | "npc" | "monster">;
  maxDistance?: number;
  minDistance?: number;
  excludeIds?: Set<string>;
  hostileOnly?: boolean;
  friendlyOnly?: boolean;
}

export function selectStableTarget(candidates: TargetCandidate[], sourcePosition: { x: number; y: number }): SelectedTarget {
  const sortedCandidates = getSortedCandidates(candidates, sourcePosition);
  if (sortedCandidates.length === 0) return { id: null, distance: Infinity };
  const selected = sortedCandidates[0]!;
  return {
    id: selected.id,
    position: selected.position,
    distance: selected.distance,
    tieBreaker: `distance:${selected.distance.toFixed(2)},hash:${selected.idHash.toString(16)}`,
  };
}

export function selectAttackTarget(candidates: TargetCandidate[], sourcePosition: { x: number; y: number }): SelectedTarget {
  const players = candidates.filter((candidate) => candidate.type === "player");
  const npcs = candidates.filter((candidate) => candidate.type === "npc");
  const monsters = candidates.filter((candidate) => candidate.type === "monster");
  if (players.length > 0) return selectStableTarget(players, sourcePosition);
  if (npcs.length > 0) return selectStableTarget(npcs, sourcePosition);
  if (monsters.length > 0) return selectStableTarget(monsters, sourcePosition);
  return { id: null, distance: Infinity };
}

export function selectClosestTarget(candidates: TargetCandidate[], sourcePosition: { x: number; y: number }, options?: TargetFilterOptions): SelectedTarget {
  let filtered = candidates;
  if (options?.types?.length) {
    const typeSet = new Set(options.types);
    filtered = filtered.filter((candidate) => typeSet.has(candidate.type));
  }
  if (options?.excludeIds?.size) filtered = filtered.filter((candidate) => !options.excludeIds?.has(candidate.id));
  if (options?.minDistance !== undefined) filtered = filtered.filter((candidate) => candidate.distance >= options.minDistance!);
  if (options?.maxDistance !== undefined) filtered = filtered.filter((candidate) => candidate.distance <= options.maxDistance!);
  return selectStableTarget(filtered, sourcePosition);
}

export function selectSafestTarget(candidates: TargetCandidate[], sourcePosition: { x: number; y: number }, threats: Array<{ position: { x: number; y: number } }>): SelectedTarget {
  if (candidates.length === 0) return { id: null, distance: Infinity };
  const scored = candidates.map((candidate) => {
    const minThreatDistance = threats.reduce((best, threat) => Math.min(best, calculateDistance(candidate.position, threat.position)), Infinity);
    return { candidate, score: minThreatDistance - candidate.distance * 0.1 };
  });
  // Bolt: Optimized hot-path sorting by replacing slow localeCompare with direct relational string comparisons
  scored.sort((a, b) => a.score - b.score || a.candidate.idHash - b.candidate.idHash || (a.candidate.id < b.candidate.id ? -1 : a.candidate.id > b.candidate.id ? 1 : 0));
  const selected = scored[0]!.candidate;
  return { id: selected.id, position: selected.position, distance: selected.distance, tieBreaker: `safest,hash:${selected.idHash.toString(16)}` };
}

function getSortedCandidates(candidates: TargetCandidate[], sourcePosition: { x: number; y: number }): TargetCandidate[] {
  return candidates.map((candidate) => ({
    ...candidate,
    distance: candidate.distance > 0 ? candidate.distance : calculateDistance(sourcePosition, candidate.position),
    idHash: candidate.idHash > 0 ? candidate.idHash : stableHash32(candidate.id),
  })).sort((a, b) => a.distance - b.distance || a.idHash - b.idHash || (a.spawnHash ?? 0) - (b.spawnHash ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function calculateDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function createTargetCandidate(id: string, position: { x: number; y: number }, type: "player" | "npc" | "monster", sourcePosition: { x: number; y: number }, spawnHash?: number): TargetCandidate {
  return { id, position, type, distance: calculateDistance(sourcePosition, position), idHash: stableHash32(id), spawnHash };
}

export function createTargetCandidates(entities: Array<{ id: string; position: { x: number; y: number }; type: "player" | "npc" | "monster"; spawnHash?: number }>, sourcePosition: { x: number; y: number }): TargetCandidate[] {
  return entities.map((entity) => createTargetCandidate(entity.id, entity.position, entity.type, sourcePosition, entity.spawnHash));
}

export function verifyTargetSelectionDeterminism(candidates: TargetCandidate[], sourcePosition: { x: number; y: number }, iterations = 10): boolean {
  const first = selectStableTarget(candidates, sourcePosition);
  for (let index = 1; index < iterations; index++) {
    const next = selectStableTarget(candidates, sourcePosition);
    if (next.id !== first.id || next.distance !== first.distance) return false;
  }
  return true;
}
