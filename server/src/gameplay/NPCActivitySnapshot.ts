/**
 * NPC Activity Snapshot - Deterministic Server-Authoritative Activity State
 * 
 * Provides canonical truth path for NPC/Monster activity visible in 2D client.
 * All activity is computed from server runtime, not client-side or UI state.
 * 
 * Design constraints:
 * - No Math.random() for activity decisions
 * - No Date.now() for behavior changes  
 * - No wall-clock timing
 * - Deterministic: same tick + same input = same output
 * - Stable target selection: same candidates = same target
 * - Bounded memory events: hard limits per NPC/tick
 */

import { stableHash32, createARESeed } from "../../core/determinism/AREDeterminism.js";
import type { NPCMemoryV3 } from "../npc/brain/NPCMemoryV3.js";

// ============================================================================
// Activity Types
// ============================================================================

/**
 * NPC Activity States - canonical server-generated activities
 */
export type NPCActivityState = 
  | "idle"           // Default, no active goal
  | "wandering"      // Deterministic movement within bounds
  | "working"        // Work/role-based activity (blacksmith, farmer, merchant, etc.)
  | "guarding"       // Defensive posture, patrol intent, threat prioritization
  | "fleeing"        // Danger evasion, escape intent
  | "attacking";     // Combat engagement

/**
 * Monster archetype for differentiated behavior
 */
export type MonsterArchetype =
  | "beast"          // Natural predator, territorial
  | "undead"         // Aggressive, relentless
  | "elemental"      // Environmental, area-based
  | "demon"          // Hostile, intelligent
  | "golem";         // Defensive, territorial

/**
 * NPC Work/Role types visible in activity snapshot
 */
export type NPCWorkRole =
  | "blacksmith"
  | "farmer"
  | "merchant"
  | "guard"
  | "healer"
  | "scholar"
  | "tavern_keeper"
  | "fisherman"
  | "woodcutter"
  | "miner"
  | "craftsman"
  | "noble"
  | "citizen";

/**
 * NPC Activity Snapshot Entry - one per visible NPC/Monster
 */
export interface NPCActivityEntry {
  /** Unique entity identifier (npcId or monsterId) */
  entityId: string;
  
  /** Display name for the entity */
  name: string;
  
  /** Current canonical activity state */
  activity: NPCActivityState;
  
  /** Optional target entity ID for directed activities */
  intentTargetId?: string;
  
  /** Chunk key for spatial indexing (format: "chunkX:chunkZ") */
  chunkKey: string;
  
  /** Position in world coordinates */
  position: {
    x: number;
    y: number;
  };
  
  /** Facing direction (0-360 degrees) */
  facing?: number;
  
  /** Movement intent vector */
  movementIntent?: {
    x: number;
    y: number;
  };
  
  /** Optional human-readable status text key */
  statusTextKey?: string;
  
  /** Work/role for working NPCs */
  workRole?: NPCWorkRole;
  
  /** Monster archetype if applicable */
  monsterArchetype?: MonsterArchetype;
  
  /** Deterministic hash of source tick and input for verification */
  activityHash: string;
  
  /** Source tick that generated this snapshot */
  sourceTick: number;
}

// ============================================================================
// Memory Event Types
// ============================================================================

/**
 * Bounded memory event types for activity state changes
 */
export type ActivityMemoryEventType =
  | "activity_changed"
  | "target_acquired"
  | "target_lost"
  | "danger_detected"
  | "work_started"
  | "work_completed"
  | "flee_initiated"
  | "guard_alert";

/**
 * Activity memory event - bounded, deterministic
 */
export interface ActivityMemoryEvent {
  id: string;
  entityId: string;
  tick: number;
  eventType: ActivityMemoryEventType;
  fromActivity?: NPCActivityState;
  toActivity?: NPCActivityEvent;
  targetId?: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// Internal Activity Resolution Types
// ============================================================================

/**
 * Activity resolution context - all inputs for deterministic resolution
 */
export interface ActivityResolutionContext {
  tick: number;
  entityId: string;
  entityName: string;
  position: { x: number; y: number };
  chunkKey: string;
  brainState: string;
  health: number;
  energy: number;
  nearbyThreats: Array<{
    id: string;
    position: { x: number; y: number };
    threatLevel: number;
  }>;
  nearbyTargets: Array<{
    id: string;
    position: { x: number; y: number };
    type: "player" | "npc" | "monster";
  }>;
  memory?: NPCMemoryV3;
  workRole?: NPCWorkRole;
  monsterArchetype?: MonsterArchetype;
}

/**
 * Resolved activity with decision metadata
 */
export interface ResolvedActivity {
  activity: NPCActivityState;
  intentTargetId?: string;
  facing?: number;
  movementIntent?: { x: number; y: number };
  statusTextKey?: string;
  memoryEvent?: ActivityMemoryEvent;
}

// ============================================================================
// Stable Target Selection Types
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

// ============================================================================
// Memory Bounds Configuration
// ============================================================================

/**
 * Configuration for memory event bounds
 */
export interface MemoryBoundsConfig {
  /** Maximum events per NPC */
  maxEventsPerNPC: number;
  /** Maximum events per tick per NPC */
  maxEventsPerTick: number;
  /** Compaction threshold ratio (0-1) */
  compactionThreshold: number;
  /** Age cutoff for compaction (in ticks) */
  compactionAgeCutoff: number;
}

export const DEFAULT_MEMORY_BOUNDS: MemoryBoundsConfig = {
  maxEventsPerNPC: 100,
  maxEventsPerTick: 5,
  compactionThreshold: 0.8,
  compactionAgeCutoff: 1000,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate chunk key from position
 */
export function getChunkKey(x: number, y: number, chunkSize = 64): string {
  const cx = Math.floor(x / chunkSize);
  const cy = Math.floor(y / chunkSize);
  return `${cx}:${cy}`;
}

/**
 * Calculate stable distance between two positions
 */
export function calculateDistance(
  from: { x: number; y: number },
  to: { x: number; y: number }
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Generate deterministic activity hash for verification
 */
export function generateActivityHash(
  tick: number,
  entityId: string,
  activity: NPCActivityState,
  position: { x: number; y: number }
): string {
  const seed = createARESeed([tick, entityId, activity, position.x, position.y]);
  return stableHash32(seed).toString(16).padStart(8, "0");
}

/**
 * Generate memory event ID deterministically
 */
export function generateMemoryEventId(
  entityId: string,
  tick: number,
  eventType: ActivityMemoryEventType
): string {
  const seed = createARESeed([entityId, tick, eventType]);
  const hash = stableHash32(seed);
  return `ame_${hash.toString(16)}`;
}

// ============================================================================
// Activity Event for state machine
// ============================================================================

/**
 * Activity event type for state transition tracking
 */
export type NPCActivityEvent = 
  | "enter_idle"
  | "enter_wandering"
  | "enter_working"
  | "enter_guarding"
  | "enter_fleeing"
  | "enter_attacking"
  | "target_acquired"
  | "target_lost"
  | "danger_detected"
  | "no_danger"
  | "work_started"
  | "work_completed"
  | "low_health"
  | "energy_recovered";

// ============================================================================
// Snapshot Generation Types
// ============================================================================

/**
 * Input for generating full NPC activity snapshot
 */
export interface NPCActivitySnapshotInput {
  tick: number;
  entities: ActivityResolutionContext[];
}

/**
 * Full NPC Activity Snapshot - part of LiveGameplaySnapshot
 */
export interface NPCActivitySnapshot {
  serverTick: number;
  /** All visible NPC/Monster activity entries */
  entries: NPCActivityEntry[];
  /** Memory events for this tick */
  memoryEvents: ActivityMemoryEvent[];
  /** Total entities tracked */
  entityCount: number;
  /** Hash of all entries for determinism verification */
  snapshotHash: string;
}