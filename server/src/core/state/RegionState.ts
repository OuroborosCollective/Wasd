// @ARE-GUARD-EXEMPT: Sync timestamps for state management; not world-state input.
/**
 * @file server/src/core/state/RegionState.ts
 * @description Data models for regional world state in Arelorian.
 * All numeric values use Fixed-Point Arithmetic (κ=1000) for determinism.
 */

export const KAPPA = 1000; // Fixed-point scaling factor

export type FixedPointInt = number; // Represents value * KAPPA

// Enums for categorical state
export enum BiomeType {
  FOREST = 'FOREST',
  DESERT = 'DESERT',
  MOUNTAIN = 'MOUNTAIN',
  TUNDRA = 'TUNDRA',
  OCEAN = 'OCEAN',
  SWAMP = 'SWAMP',
  PLAINS = 'PLAINS',
}

export enum ControlStatus {
  NEUTRAL = 'NEUTRAL',
  PLAYER_CONTROLLED = 'PLAYER_CONTROLLED',
  NPC_CONTROLLED = 'NPC_CONTROLLED',
  CONTESTED = 'CONTESTED',
  WILDERNESS = 'WILDERNESS',
}

export enum SecurityLevel {
  SAFE = 'SAFE',
  CAUTION = 'CAUTION',
  DANGER = 'DANGER',
  HIGH_DANGER = 'HIGH_DANGER',
}

export enum StabilityLevel {
  STABLE = 'STABLE',
  UNSTABLE = 'UNSTABLE',
  CONTESTED = 'CONTESTED',
  CRITICAL = 'CRITICAL',
  PARTIAL_COLLAPSE = 'PARTIAL_COLLAPSE',
  TOTAL_COLLAPSE = 'TOTAL_COLLAPSE',
}

// Oracle pressure tags for region events
export type OraclePressureTag = 
  | 'DEPLETED_RESOURCES'
  | 'HIGH_CONFLICT'
  | 'RESOURCE_SURGE'
  | 'SECURITY_BREACH'
  | 'ECONOMIC_BOOM'
  | 'NPC_MIGRATION';

/**
 * RegionState - Single region's complete state
 * All numeric values stored as Fixed-Point Integers (value * KAPPA)
 */
export interface RegionState {
  // Identifiers
  regionId: string;
  
  // Categorical
  biomeType: BiomeType;
  controlStatus: ControlStatus;
  securityLevel: SecurityLevel;
  stabilityLevel: StabilityLevel;
  
  // Resource tracking (Fixed-Point, k=1000)
  resourceSaturation: Map<string, FixedPointInt>; // resourceType -> saturation
  
  // Infrastructure & Economy
  infrastructureLevel: FixedPointInt; // 0 to KAPPA
  tradeFlowIntensity: FixedPointInt; // trade activity level
  threatLevel: FixedPointInt;
  
  // Oracle System
  oraclePressureTags: OraclePressureTag[];
  
  // NPC Management
  activeNPCGroups: string[]; // group IDs
  
  // Territory
  territoryOwnership: Map<string, FixedPointInt>; // factionId -> control share (0-1000)
  
  // Economy
  taxHealth: FixedPointInt; // 0-1000
  matrixEnergyBalance: FixedPointInt; // energy for territory maintenance
  
  // Visual State
  visualCorruptionState: FixedPointInt; // 0 = pristine, KAPPA = corrupted
  
  // Timestamps
  lastFullUpdate: bigint; // tick number
  lastPhaseChange: bigint;
}

/**
 * Creates a default RegionState
 */
export function createDefaultRegionState(regionId: string): RegionState {
  return {
    regionId,
    biomeType: BiomeType.FOREST,
    controlStatus: ControlStatus.WILDERNESS,
    securityLevel: SecurityLevel.SAFE,
    stabilityLevel: StabilityLevel.STABLE,
    resourceSaturation: new Map(),
    infrastructureLevel: KAPPA, // 1.0 = full
    tradeFlowIntensity: 0,
    threatLevel: 0,
    oraclePressureTags: [],
    activeNPCGroups: [],
    territoryOwnership: new Map(),
    taxHealth: KAPPA,
    matrixEnergyBalance: KAPPA,
    visualCorruptionState: 0,
    lastFullUpdate: BigInt(0),
    lastPhaseChange: BigInt(0),
  };
}

/**
 * WorldState - Global world state container
 */
export interface WorldState {
  regions: Map<string, RegionState>;
  globalTick: bigint;
  lastSyncTimestamp: number;
}

/**
 * Creates a default WorldState
 */
export function createDefaultWorldState(): WorldState {
  return {
    regions: new Map(),
    globalTick: BigInt(0),
    lastSyncTimestamp: Date.now(),
  };
}

// Type exports for external use
export type { RegionState as IRegionState };
export type { WorldState as IWorldState };