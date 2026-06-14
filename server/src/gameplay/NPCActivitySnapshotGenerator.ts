/**
 * NPC Activity Snapshot Generator
 * 
 * Generates the canonical npc_activity_snapshot for LiveGameplaySnapshot.
 * Integrates Activity Resolver, Stable Target Selection, and Bounded Memory Events.
 * 
 * Canonical truth path:
 * server tick / world chunk / npc brain state
 * → deterministic npc activity resolution
 * → npc_activity_snapshot
 * → LiveGameplaySnapshot
 * → 2D marker/status rendering
 */

import { createARESeed, stableHash32 } from "../../core/determinism/AREDeterminism.js";
import type {
  NPCActivityEntry,
  NPCActivitySnapshot,
  NPCActivitySnapshotInput,
  ActivityResolutionContext,
  ResolvedActivity,
  NPCWorkRole,
  MonsterArchetype,
  ActivityMemoryEvent,
} from "./NPCActivitySnapshot.js";
import {
  getChunkKey,
  generateActivityHash,
} from "./NPCActivitySnapshot.js";
import { resolveActivity, calculateDistance } from "./ActivityResolver.js";
import { globalMemoryEventManager } from "./BoundedMemoryEvents.js";

// ============================================================================
// Snapshot Generator
// ============================================================================

/**
 * Generate NPC Activity Snapshot for a tick
 * Deterministic: same input always produces same snapshot
 */
export function generateNPCActivitySnapshot(
  input: NPCActivitySnapshotInput
): NPCActivitySnapshot {
  const { tick, entities } = input;

  // Resolve activity for each entity
  const entries: NPCActivityEntry[] = [];
  const allMemoryEvents: ActivityMemoryEvent[] = [];

  // Sort entities deterministically before processing
  const sortedEntities = [...entities].sort((a, b) => {
    // Primary: chunkKey
    if (a.chunkKey !== b.chunkKey) {
      return a.chunkKey < b.chunkKey ? -1 : 1;
    }
    // Secondary: entityId
    return a.entityId < b.entityId ? -1 : a.entityId > b.entityId ? 1 : 0;
  });

  // Track previous activities for memory events
  const previousActivities = new Map<string, ResolvedActivity>();

  for (const entity of sortedEntities) {
    // Resolve activity deterministically
    const resolved = resolveActivity(entity);

    // Get previous activity for change detection
    const previousActivity = previousActivities.get(entity.entityId);

    // Generate memory event for activity changes
    if (!previousActivity || previousActivity.activity !== resolved.activity) {
      const event = globalMemoryEventManager.addActivityChangeEvent(
        entity.entityId,
        tick,
        previousActivity?.activity,
        resolved.activity
      );
      if (event) {
        allMemoryEvents.push(event);
      }
    }

    // Create snapshot entry
    const entry: NPCActivityEntry = {
      entityId: entity.entityId,
      name: entity.entityName,
      activity: resolved.activity,
      intentTargetId: resolved.intentTargetId,
      chunkKey: entity.chunkKey,
      position: entity.position,
      facing: resolved.facing,
      movementIntent: resolved.movementIntent,
      statusTextKey: resolved.statusTextKey,
      workRole: entity.workRole,
      monsterArchetype: entity.monsterArchetype,
      activityHash: generateActivityHash(
        tick,
        entity.entityId,
        resolved.activity,
        entity.position
      ),
      sourceTick: tick,
    };

    entries.push(entry);
    previousActivities.set(entity.entityId, resolved);
  }

  // Sort entries deterministically
  const sortedEntries = sortActivityEntries(entries);

  // Generate snapshot hash
  const snapshotHash = generateSnapshotHash(tick, sortedEntries);

  return {
    serverTick: tick,
    entries: sortedEntries,
    memoryEvents: allMemoryEvents,
    entityCount: sortedEntries.length,
    snapshotHash,
  };
}

/**
 * Sort activity entries deterministically
 * Primary: chunkKey
 * Secondary: entityId
 * Tertiary: activity (for consistent ordering)
 */
function sortActivityEntries(entries: NPCActivityEntry[]): NPCActivityEntry[] {
  return [...entries].sort((a, b) => {
    // Primary: chunkKey
    if (a.chunkKey !== b.chunkKey) {
      return a.chunkKey < b.chunkKey ? -1 : 1;
    }
    // Secondary: entityId
    if (a.entityId !== b.entityId) {
      return a.entityId < b.entityId ? -1 : 1;
    }
    // Tertiary: activity
    return a.activity < b.activity ? -1 : a.activity > b.activity ? 1 : 0;
  });
}

/**
 * Generate deterministic snapshot hash for verification
 */
function generateSnapshotHash(
  tick: number,
  entries: NPCActivityEntry[]
): string {
  const components = [
    tick.toString(),
    entries.length.toString(),
    ...entries.map(e => createARESeed([
      e.entityId,
      e.activity,
      e.chunkKey,
      e.position.x,
      e.position.y,
      e.sourceTick,
    ])),
  ];

  const seed = components.join("||");
  return stableHash32(seed).toString(16).padStart(8, "0");
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create ActivityResolutionContext from entity data
 */
export function createActivityContext(
  entityId: string,
  entityName: string,
  position: { x: number; y: number },
  brainState: string,
  health: number,
  energy: number,
  tick: number,
  options?: {
    workRole?: NPCWorkRole;
    monsterArchetype?: MonsterArchetype;
    nearbyThreats?: Array<{
      id: string;
      position: { x: number; y: number };
      threatLevel: number;
    }>;
    nearbyTargets?: Array<{
      id: string;
      position: { x: number; y: number };
      type: "player" | "npc" | "monster";
    }>;
  }
): ActivityResolutionContext {
  return {
    tick,
    entityId,
    entityName,
    position,
    chunkKey: getChunkKey(position.x, position.y),
    brainState,
    health,
    energy,
    nearbyThreats: options?.nearbyThreats ?? [],
    nearbyTargets: options?.nearbyTargets ?? [],
    workRole: options?.workRole,
    monsterArchetype: options?.monsterArchetype,
  };
}

/**
 * Filter entities by visibility/chunk
 */
export function filterVisibleEntities(
  entities: ActivityResolutionContext[],
  playerPosition: { x: number; y: number },
  viewRadius: number
): ActivityResolutionContext[] {
  const radiusSq = viewRadius * viewRadius;

  return entities.filter(entity => {
    const dx = entity.position.x - playerPosition.x;
    const dy = entity.position.y - playerPosition.y;
    return dx * dx + dy * dy <= radiusSq;
  });
}

/**
 * Get entities in specific chunk
 */
export function getEntitiesInChunk(
  entities: ActivityResolutionContext[],
  chunkX: number,
  chunkZ: number
): ActivityResolutionContext[] {
  const chunkKey = `${chunkX}:${chunkZ}`;
  return entities.filter(e => e.chunkKey === chunkKey);
}

// ============================================================================
// Verification Functions
// ============================================================================

/**
 * Verify snapshot determinism
 * Same input should produce same output
 */
export function verifySnapshotDeterminism(
  input: NPCActivitySnapshotInput,
  iterations = 10
): boolean {
  const results: NPCActivitySnapshot[] = [];

  for (let i = 0; i < iterations; i++) {
    // Clear memory between iterations to ensure clean state
    globalMemoryEventManager.clear();
    results.push(generateNPCActivitySnapshot(input));
  }

  // Compare all results
  const first = results[0];
  for (const result of results) {
    if (result.serverTick !== first.serverTick) return false;
    if (result.entityCount !== first.entityCount) return false;
    if (result.snapshotHash !== first.snapshotHash) return false;
    
    // Check entries match
    for (let i = 0; i < result.entries.length; i++) {
      const a = first.entries[i];
      const b = result.entries[i];
      if (!a || !b) return false;
      if (a.entityId !== b.entityId) return false;
      if (a.activity !== b.activity) return false;
      if (a.chunkKey !== b.chunkKey) return false;
    }
  }

  return true;
}

/**
 * Verify memory bounds are respected
 */
export function verifyMemoryBounds(
  input: NPCActivitySnapshotInput,
  maxEventsPerNPC: number,
  maxEventsPerTick: number
): boolean {
  // Generate snapshot
  globalMemoryEventManager.clear();
  generateNPCActivitySnapshot(input);

  // Check stats
  const stats = globalMemoryEventManager.getStats();
  
  for (const [entityId, stat] of Object.entries(stats)) {
    if (stat.eventCount > maxEventsPerNPC) {
      console.error(`Entity ${entityId} exceeds max events: ${stat.eventCount} > ${maxEventsPerNPC}`);
      return false;
    }
  }

  return true;
}