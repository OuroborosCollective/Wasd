export {
  DEFAULT_MEMORY_BOUNDS,
  calculateDistance,
  generateActivityHash,
  generateMemoryEventId,
  getChunkKey,
} from "./NPCActivitySnapshot.js";
export type {
  ActivityMemoryEvent,
  ActivityMemoryEventType,
  ActivityResolutionContext,
  MemoryBoundsConfig,
  MonsterArchetype,
  NPCActivityEntry,
  NPCActivityEvent,
  NPCActivitySnapshot,
  NPCActivitySnapshotInput,
  NPCActivityState,
  NPCWorkRole,
  ResolvedActivity,
} from "./NPCActivitySnapshot.js";

export { resolveActivity } from "./ActivityResolver.js";
export {
  createTargetCandidate,
  createTargetCandidates,
  selectClosestTarget,
  selectSafestTarget,
  selectStableTarget,
  verifyTargetSelectionDeterminism,
} from "./StableTargetSelection.js";
export type { SelectedTarget, TargetCandidate, TargetFilterOptions } from "./StableTargetSelection.js";
export { BoundedMemoryEventStore, MemoryEventManager, globalMemoryEventManager } from "./BoundedMemoryEvents.js";
export {
  clearNPCActivitySnapshotGeneratorState,
  createActivityContext,
  filterVisibleEntities,
  generateNPCActivitySnapshot,
  getEntitiesInChunk,
  verifyMemoryBounds,
  verifySnapshotDeterminism,
} from "./NPCActivitySnapshotGenerator.js";
