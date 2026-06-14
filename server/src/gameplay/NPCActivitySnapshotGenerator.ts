import { createARESeed, stableHash32 } from "../core/determinism/AREDeterminism.js";
import type { ActivityMemoryEvent, ActivityResolutionContext, MonsterArchetype, NPCActivityEntry, NPCActivitySnapshot, NPCActivitySnapshotInput, NPCWorkRole, ResolvedActivity } from "./NPCActivitySnapshot.js";
import { generateActivityHash, getChunkKey } from "./NPCActivitySnapshot.js";
import { resolveActivity } from "./ActivityResolver.js";
import { globalMemoryEventManager } from "./BoundedMemoryEvents.js";

const previousActivitiesByEntity = new Map<string, ResolvedActivity>();

export function clearNPCActivitySnapshotGeneratorState(): void {
  previousActivitiesByEntity.clear();
}

export function generateNPCActivitySnapshot(input: NPCActivitySnapshotInput): NPCActivitySnapshot {
  const { tick, entities } = input;
  const entries: NPCActivityEntry[] = [];
  const allMemoryEvents: ActivityMemoryEvent[] = [];
  const sortedEntities = [...entities].sort((a, b) => a.chunkKey.localeCompare(b.chunkKey) || a.entityId.localeCompare(b.entityId));

  for (const entity of sortedEntities) {
    const resolved = resolveActivity(entity);
    const previousActivity = previousActivitiesByEntity.get(entity.entityId);
    if (previousActivity && previousActivity.activity !== resolved.activity) {
      const event = globalMemoryEventManager.addActivityChangeEvent(entity.entityId, tick, previousActivity.activity, resolved.activity);
      if (event) allMemoryEvents.push(event);
    }

    entries.push({
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
      activityHash: generateActivityHash(tick, entity.entityId, resolved.activity, entity.position),
      sourceTick: tick,
    });
    previousActivitiesByEntity.set(entity.entityId, resolved);
  }

  const sortedEntries = sortActivityEntries(entries);
  return {
    serverTick: tick,
    entries: sortedEntries,
    memoryEvents: allMemoryEvents,
    entityCount: sortedEntries.length,
    snapshotHash: generateSnapshotHash(tick, sortedEntries),
  };
}

function sortActivityEntries(entries: NPCActivityEntry[]): NPCActivityEntry[] {
  return [...entries].sort((a, b) => a.chunkKey.localeCompare(b.chunkKey) || a.entityId.localeCompare(b.entityId) || a.activity.localeCompare(b.activity));
}

function generateSnapshotHash(tick: number, entries: NPCActivityEntry[]): string {
  const components = [
    tick.toString(),
    entries.length.toString(),
    ...entries.map((entry) => createARESeed([entry.entityId, entry.activity, entry.chunkKey, entry.position.x, entry.position.y, entry.sourceTick])),
  ];
  return stableHash32(components.join("||")).toString(16).padStart(8, "0");
}

export function createActivityContext(entityId: string, entityName: string, position: { x: number; y: number }, brainState: string, health: number, energy: number, tick: number, options?: { workRole?: NPCWorkRole; monsterArchetype?: MonsterArchetype; nearbyThreats?: Array<{ id: string; position: { x: number; y: number }; threatLevel: number }>; nearbyTargets?: Array<{ id: string; position: { x: number; y: number }; type: "player" | "npc" | "monster" }> }): ActivityResolutionContext {
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

export function filterVisibleEntities(entities: ActivityResolutionContext[], playerPosition: { x: number; y: number }, viewRadius: number): ActivityResolutionContext[] {
  const radiusSq = viewRadius * viewRadius;
  return entities.filter((entity) => {
    const dx = entity.position.x - playerPosition.x;
    const dy = entity.position.y - playerPosition.y;
    return dx * dx + dy * dy <= radiusSq;
  });
}

export function getEntitiesInChunk(entities: ActivityResolutionContext[], chunkX: number, chunkZ: number): ActivityResolutionContext[] {
  const chunkKey = `${chunkX}:${chunkZ}`;
  return entities.filter((entity) => entity.chunkKey === chunkKey);
}

export function verifySnapshotDeterminism(input: NPCActivitySnapshotInput, iterations = 10): boolean {
  const results: NPCActivitySnapshot[] = [];
  for (let index = 0; index < iterations; index++) {
    globalMemoryEventManager.clear();
    clearNPCActivitySnapshotGeneratorState();
    results.push(generateNPCActivitySnapshot(input));
  }
  const first = results[0];
  if (!first) return true;
  for (const result of results) {
    if (result.serverTick !== first.serverTick || result.entityCount !== first.entityCount || result.snapshotHash !== first.snapshotHash) return false;
    for (let index = 0; index < result.entries.length; index++) {
      const a = first.entries[index];
      const b = result.entries[index];
      if (!a || !b) return false;
      if (a.entityId !== b.entityId || a.activity !== b.activity || a.chunkKey !== b.chunkKey) return false;
    }
  }
  return true;
}

export function verifyMemoryBounds(input: NPCActivitySnapshotInput, maxEventsPerNPC: number, _maxEventsPerTick: number): boolean {
  globalMemoryEventManager.clear();
  clearNPCActivitySnapshotGeneratorState();
  generateNPCActivitySnapshot(input);
  const stats = globalMemoryEventManager.getStats();
  for (const stat of Object.values(stats)) {
    if (stat.eventCount > maxEventsPerNPC) return false;
  }
  return true;
}
