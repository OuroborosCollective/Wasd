import { createARESeed, stableHash32 } from "../core/determinism/AREDeterminism.js";

export type NPCActivityState = string;
export type MonsterArchetype = string;
export type NPCWorkRole = string;
export type ActivityMemoryEventType = string;
export type NPCActivityEvent = string;

export interface NPCActivityEntry {
  entityId: string;
  name: string;
  activity: NPCActivityState;
  intentTargetId?: string;
  chunkKey: string;
  position: { x: number; y: number };
  facing?: number;
  movementIntent?: { x: number; y: number };
  statusTextKey?: string;
  workRole?: NPCWorkRole;
  monsterArchetype?: MonsterArchetype;
  activityHash: string;
  sourceTick: number;
}

export interface ActivityMemoryEvent {
  id: string;
  entityId: string;
  tick: number;
  eventType: ActivityMemoryEventType;
  fromActivity?: NPCActivityState;
  toActivity?: NPCActivityState | NPCActivityEvent;
  targetId?: string;
  data?: Record<string, unknown>;
}

export interface ActivityResolutionContext {
  tick: number;
  entityId: string;
  entityName: string;
  position: { x: number; y: number };
  chunkKey: string;
  brainState: string;
  health: number;
  energy: number;
  nearbyThreats: Array<{ id: string; position: { x: number; y: number }; threatLevel: number }>;
  nearbyTargets: Array<{ id: string; position: { x: number; y: number }; type: "player" | "npc" | "monster" }>;
  memory?: unknown;
  workRole?: NPCWorkRole;
  monsterArchetype?: MonsterArchetype;
}

export interface ResolvedActivity {
  activity: NPCActivityState;
  intentTargetId?: string;
  facing?: number;
  movementIntent?: { x: number; y: number };
  statusTextKey?: string;
  memoryEvent?: ActivityMemoryEvent;
}

export interface TargetCandidate {
  id: string;
  position: { x: number; y: number };
  type: "player" | "npc" | "monster";
  distance: number;
  idHash: number;
}

export interface SelectedTarget {
  id: string | null;
  position?: { x: number; y: number };
  distance: number;
  tieBreaker?: string;
}

export interface MemoryBoundsConfig {
  maxEventsPerNPC: number;
  maxEventsPerTick: number;
  compactionThreshold: number;
  compactionAgeCutoff: number;
}

export const DEFAULT_MEMORY_BOUNDS: MemoryBoundsConfig = Object.freeze({
  maxEventsPerNPC: 100,
  maxEventsPerTick: 5,
  compactionThreshold: 0.8,
  compactionAgeCutoff: 1000,
});

export interface NPCActivitySnapshotInput {
  tick: number;
  entities: ActivityResolutionContext[];
}

export interface NPCActivitySnapshot {
  serverTick: number;
  entries: NPCActivityEntry[];
  memoryEvents: ActivityMemoryEvent[];
  entityCount: number;
  snapshotHash: string;
}

export function getChunkKey(x: number, y: number, chunkSize = 64): string {
  const cx = Math.floor(x / chunkSize);
  const cy = Math.floor(y / chunkSize);
  return `${cx}:${cy}`;
}

export function calculateDistance(from: { x: number; y: number }, to: { x: number; y: number }): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function generateActivityHash(tick: number, entityId: string, activity: NPCActivityState, position: { x: number; y: number }): string {
  const seed = createARESeed([tick, entityId, activity, position.x, position.y]);
  return stableHash32(seed).toString(16).padStart(8, "0");
}

export function generateMemoryEventId(entityId: string, tick: number, eventType: ActivityMemoryEventType): string {
  const seed = createARESeed([entityId, tick, eventType]);
  return `ame_${stableHash32(seed).toString(16)}`;
}
