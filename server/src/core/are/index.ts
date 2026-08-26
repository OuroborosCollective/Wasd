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

// Types from types.js
export type {
  Kappa,
  KappaInt,
  TickId,
  StateHash,
  ChunkCoord,
  ChunkKey,
  EntityId,
  PlayerId,
  NpcId,
  GuildId,
  QuestId,
  TickSystemId,
  MortonCode,
  ParsedChunkKey,
  TickSystemContext,
  TickSystem,
  TickTraceEvent,
} from './types.js';

// Value exports from types.js
export {
  TickSystemPriority,
  TickSystemCategory,
  createKappa,
  createKappaFromDecimal,
  createTickId,
  incrementTickId,
  createChunkCoord,
  createChunkKey,
  getChunkKey,
  createChunkKeyFromString,
  coerceChunkKey,
  parseChunkKey,
  chunkKeyToString,
  sameChunkKey,
  getNeighborChunkKeys,
  getCardinalNeighborChunkKeys,
  getChunkChebyshevDistance,
  getChunkManhattanDistance,
  createEntityId,
  createPlayerId,
  createNpcId,
  createGuildId,
  createQuestId,
  createTickSystemId,
  getTickSystemPriority,
  getTickSystemCategory,
  compareTickSystems,
  CHUNK_SIZE,
  CHUNK_SIZE_KAPPA,
  TICK_RATE_HZ,
  TICK_INTERVAL_MS,
} from './types.js';

// Core Reality Resolver: legacy inputs resolve into canonical ARE architecture.
export {
  CoreRealityResolver,
  CoreRealityResolverError,
  defaultCoreRealityResolver,
  strictCoreRealityResolver,
  resolveCoreReality,
  resolveCoreRealityDetailed,
  resolveCoreRealityStrict,
  type CoreRealityModuleId,
  type CoreRealityResolutionSource,
  type CoreRealitySeverity,
  type CoreRealityResolverOptions,
  type CoreRealityResolution,
  type CoreRealityProof,
} from '../../resolvers/CoreRealityResolver.js';

// TickSystem Core (types exported from types.js above)
export {
  type TickSystemDescriptor,
  type TickFailureRerunPolicy,
  type TickSystemFailurePolicy,
  createDefaultTickContext,
} from './TickSystem.js';

export {
  TickSystemRegistry,
  tickSystemRegistry,
  type TickSystemRegistryEvent,
  type TickSystemRegistrySnapshotEntry,
  type TickSystemExecutionFailure,
  type TickSystemExecutionReport,
} from './TickSystemRegistry.js';

// 10Hz failure-family runtime + diagnostic probe
export {
  TickFailureFamilyRuntime,
  deriveTickFailure,
  type TickFailureFamily,
  type TickFailureStage,
  type TickFailureRerunOutcome,
  type TickFailureInput,
  type TickFailureDerivation,
  type TickFailureRecord,
  type TickFailureFamilySnapshot,
} from './TickFailureFamilyRuntime.js';

export {
  TICK_FAILURE_FAMILY_PROBE_SYSTEM_NAME,
  DEFAULT_FAILURE_FAMILY_PROBE_CASES,
  TickFailureFamilyProbeError,
  TickFailureFamilyProbeSystem,
  createTickFailureFamilyProbeDescriptor,
  registerTickFailureFamilyProbeSystem,
  type FailureFamilyProbeMode,
  type FailureFamilyProbeCase,
  type FailureFamilyProbeRunStatus,
} from './TickFailureFamilyProbeSystem.js';

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
export type { DeterministicPrng } from './DeterministicPrng.js';
export { LcgPrng, createDeterministicPrng } from './DeterministicPrng.js';
export { createStateHash, isStateHash, stateHashEquals, GENESIS_STATE_HASH, GENESIS_PREVIOUS_HASH } from './StateHash.js';

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
  type WorldLogicalState,
} from './ChunkLayerState.js';

export {
  WorldBrainScheduler,
  registerWorldBrainScheduler
} from './WorldBrainScheduler.js';

export {
  WorldTickAdapter,
  worldTickAdapter,
  type WorldTick
} from './WorldTickThinShellAdapter.js';

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

// Phase 9b: Real Layer Persistence Port + Adapters (issue #2457)
export {
  type LayerPersistenceAdapter,
  type PersistedLayerState,
  PERSISTED_LAYER_ORDER,
  layersToCanonicalArray,
  canonicalArrayToLayers,
  normalizePersistedLayerState,
} from './LayerPersistencePort.js';
export { JsonLayerPersistenceAdapter, resolveLayerStateFilePath } from './JsonLayerPersistenceAdapter.js';
export { PgLayerPersistenceAdapter } from './PgLayerPersistenceAdapter.js';
export {
  createLayerPersistenceAdapter,
  getLayerPersistenceDriverName,
  resolveLayerPersistenceFilePath,
  type LayerPersistenceDriver,
} from './createLayerPersistenceAdapter.js';

// Phase 10: WorldTick Thin Shell
export {
  WorldTickThinShell,
  worldTickThinShell,
  registerWorldTickThinShell,
  type WorldStateProviderSlice,
  type WorldStateProvider,
  type TickContextWorldState,
  type WorldTickThinShellOptions,
} from './WorldTickThinShell.js';

// Deterministic Event Factory (ARE-RUNTIME-TRUTH)
export {
  TICK_MS,
  stableStringify,
  deterministicHash,
  hashData,
  createDeterministicEventId,
  createDeterministicEvent,
  stableEntityKey,
  stableSort,
  type DeterministicEventContext,
  type WorldEventInput,
} from './DeterministicEventFactory.js';

// Runtime World State Providers (ARE-RUNTIME-TRUTH)
export {
  NPCWorldStateProvider,
  PlayerWorldStateProvider,
  LootWorldStateProvider,
  CompositeWorldStateProvider,
} from './RuntimeWorldStateProviders.js';

// Phase 11: WorldBrainTickSystem - Clean TickSystem integration
export {
  WORLD_BRAIN_TICK_SYSTEM_NAME,
  WORLD_BRAIN_TICK_PRIORITY,
  WorldBrainTickSystem,
  SnapshotComposerWorldBrainSink,
  InMemoryWorldBrainReplaySink,
  createWorldBrainTickSystemDescriptor,
  registerWorldBrainTickSystem,
  type WorldBrainLayerKey,
  type WorldBrainAttractorType,
  type WorldBrainAttractor,
  type WorldBrainDelta,
  type WorldBrainCanonicalStatePort,
  type WorldBrainSnapshotSink,
  type WorldBrainReplaySink,
  type WorldBrainTickSystemOptions,
} from './WorldBrainTickSystem.js';

// Phase 11: WorldBrain runtime port wiring
export {
  RuntimeWorldBrainStatePort,
  LayerPersistenceWorldBrainReplaySink,
  chunkLayerStateToIARELayers,
  iareLayersToChunkLayerState,
  type RuntimeWorldBrainStatePortOptions,
} from './WorldBrainRuntimePort.js';

// Phase 11: Canonical Layer Seed Truth
export {
  CANONICAL_LAYER_SEED_VERSION,
  DEFAULT_ARELORIA_WORLD_SEED,
  deriveCanonicalLayerSeed,
  canonicalLayerSeedHash,
  resolveCanonicalWorldSeed,
  zeroStateHash,
  type CanonicalSeedBiomeId,
  type CanonicalLayerSeedSignals,
  type CanonicalLayerSeedInput,
  type CanonicalLayerSeedResult,
} from './CanonicalLayerSeed.js';

// Phase 11: Canonical Signal Balance Matrix
export {
  CANONICAL_SIGNAL_BALANCE_VERSION,
  CANONICAL_SIGNAL_BALANCE_MATRIX,
  applyCanonicalSignalBalance,
  calculateCanonicalSignalLayerDeltas,
  getCanonicalSignalBalanceSnapshot,
  type CanonicalNumericSignalKey,
  type CanonicalSignalBalanceRule,
  type CanonicalSignalBalanceMatrix,
} from './CanonicalLayerSignalBalance.js';

// Phase 11: Canonical Worldgen Seed Signals
export {
  deriveCanonicalWorldgenSeedSignals,
  type CanonicalWorldgenSignalInput,
} from './CanonicalLayerSeedSignals.js';

// Phase 11: OuroborosTickSystem - Ouroboros autonomous agent integration
export {
  OUROBOROS_TICK_SYSTEM_NAME,
  OUROBOROS_TICK_PRIORITY,
  OuroborosTickSystem,
  createOuroborosTickSystem,
  registerOuroborosTickSystem,
  getOuroborosTickSystem,
  type OuroborosTickSystemOptions,
} from './OuroborosTickSystem.js';

// Phase 11: OracleTickSystem - Oracle Living World System integration
export {
  ORACLE_TICK_SYSTEM_NAME,
  ORACLE_TICK_PRIORITY,
  OracleTickSystem,
  createOracleTickSystem,
  registerOracleTickSystem,
  getOracleTickSystem,
  type OracleTickSystemOptions,
  type BrainInformationFlow,
  type OracleCriticalEvent,
  type OracleRecommendation,
} from './OracleTickSystem.js';

// Phase 11: Core TickSystem registration bootstrap
export {
  CORE_TICK_SYSTEM_REGISTRATION_ORDER,
  registerCoreTickSystems,
  type CoreTickSystemName,
  type CoreTickSystemRegistrationOptions,
  type CoreTickSystemRegistrationResult,
} from './CoreTickSystemRegistration.js';

// Phase 11: WorldTickScheduler - Thin scheduler without wall-clock dependencies
export {
  ARE_TICK_RATE_HZ,
  ARE_TICK_INTERVAL_MS,
  WORLD_TICK_SCHEDULER_ORDER,
  WORLD_TICK_RECOMMENDED_PRIORITIES,
  WorldTickScheduler,
  createWorldTickScheduler,
  type WorldTickSchedulerOptions,
  type WorldTickStepResult,
  type WorldTickSchedulerSystemName,
} from './WorldTickScheduler.js';

// Phase 11: TickSystemContextProvider - HTTP route tick context
export {
  TickSystemContextProvider,
  tickContextProvider,
  getCurrentTickContext,
  getCurrentTickId,
  getWorldTimeHours,
  getDeterministicSeed,
  type TickContext,
} from './TickSystemContextProvider.js';

// Phase 11: KappaLayers - Unified 13-layer definition with Kappa1000 hashing
export {
  KAPPA_LAYER_NAMES,
  KAPPA_LAYER_CONSTANTS,
  LEGACY_LAYER_MAPPING,
  kappa1000Hash,
  hashChunkKappa1000,
  verifyChunkKappaHash,
  checksumKappaLayers,
  createEmptyKappaLayers,
  createKappaLayers,
  cloneKappaLayers,
  getKappaLayerValues,
  fromChunkLayerState,
  toChunkLayerState,
  type KappaLayerKey,
  type KappaLayers,
} from './KappaLayers.js';