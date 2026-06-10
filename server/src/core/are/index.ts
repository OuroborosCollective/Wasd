/**
 * ARE Core Module Index
 * 
 * Phase 2 of the Core Reality Alignment initiative.
 * 
 * Exports all core ARE types and systems:
 * - Branded types (Kappa, TickId, StateHash, etc.)
 * - TickSystem interface and registry
 * - Pre-built TickSystem implementations
 */

// Types
export {
  type Kappa,
  type KappaInt,
  type TickId,
  type StateHash,
  type ChunkCoord,
  type ChunkKey,
  type EntityId,
  type MortonCode,
  createKappa,
  createKappaFromDecimal,
  createTickId,
  incrementTickId,
  createStateHash,
  isStateHash,
  createChunkCoord,
  createChunkKey,
  parseChunkKey,
  createEntityId,
  GENESIS_STATE_HASH,
  CHUNK_SIZE,
  CHUNK_SIZE_KAPPA,
} from './types.js';

// TickSystem Core
export {
  type TickSystem,
  type TickSystemDescriptor,
  type TickSystemContext,
  type TickSystemPriority,
  TickSystemPriority,
  createDefaultTickContext,
} from './TickSystem.js';

export {
  TickSystemRegistry,
  tickSystemRegistry,
  type TickSystemRegistryEvent,
} from './TickSystemRegistry.js';

// Pre-built TickSystem Implementations
export {
  SpatialBroadcastGrid,
  spatialBroadcastGrid,
  SpatialBroadcastTickSystem,
} from './SpatialBroadcastTickSystem.js';

export {
  WarfrontTickSystem,
  registerWarfrontSystem,
} from './WarfrontTickSystem.js';

export {
  ManifestTickSystem,
  registerManifestSystem,
} from './ManifestTickSystem.js';

// Supporting modules
export { DeterministicPrng, LcgPrng, createDeterministicPrng } from './DeterministicPrng.js';
export { createStateHash, isStateHash, stateHashEquals, GENESIS_STATE_HASH, GENESIS_PREVIOUS_HASH, type StateHash } from './StateHash.js';

// Integration
export { WorldTickRegistryAdapter, createWorldTickRegistryAdapter } from './WorldTickRegistryAdapter.js';

// Domain TickSystems
export { CombatTickSystem, registerCombatSystem } from './CombatTickSystem.js';
export { NPCTickSystem, registerNPCSystem } from './NPCTickSystem.js';
export { EconomyTickSystem, registerEconomySystem } from './EconomyTickSystem.js';
export { QuestTickSystem, registerQuestSystem } from './QuestTickSystem.js';
export { GuildTickSystem, registerGuildSystem } from './GuildTickSystem.js';

// Phase 8-10: World Brain & 13-Layer Emergent Logic
export {
  ChunkLayerIndex,
  LAYER_NAMES,
  LAYER_THRESHOLDS,
  ATTRACTOR_TYPES,
  createEmptyLayerState,
  type ChunkLayerState,
  type LayerDelta,
  type OmegaAttractorState,
  type WorldBrainSnapshot,
} from './ChunkLayerState.js';

export {
  WorldBrainScheduler,
  registerWorldBrainScheduler
} from './WorldBrainScheduler.js';

// Phase 8: Snapshot Composer & Layer Validation
export {
  IARE_LAYER_NAMES,
  LAYER_CONSTANTS,
  createEmptyIARELogicLayers,
  getLayerValues,
  type IARELogicLayers
} from './IARELogicLayers.js';

export {
  SnapshotComposer,
  snapshotComposer,
  DeterminismViolation,
  type SnapshotEntityState,
  type ChunkSnapshot,
  type WorldSnapshot
} from './SnapshotComposer.js';

// Phase 9: Write-Behind Persistence Queue
export {
  LayerPersistenceQueue,
  layerPersistenceQueue,
  createLayerPersistenceEvent,
  PERSISTENCE_CONSTANTS,
  type PersistenceQueueStats,
  type LayerPersistenceEvent
} from './LayerPersistenceQueue.js';

// Phase 10: WorldTick Thin Shell
export {
  WorldTickThinShell,
  worldTickThinShell,
  registerWorldTickThinShell
} from './WorldTickThinShell.js';