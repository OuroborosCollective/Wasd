export const REGION_PRESSURE_KAPPA = 1000 as const;
export const REGION_PRESSURE_MAX_DELTA_PER_TICK = 125 as const;

export const REGION_LOD_TIERS = [
  'observed_chunk',
  'near_chunk',
  'region_summary',
  'sleeping_region',
] as const;

export type RegionLodTier = (typeof REGION_LOD_TIERS)[number];

export const REGION_PRESSURE_FIELDS = [
  'resourcePressurePerMille',
  'migrationPressurePerMille',
  'tradePressurePerMille',
  'threatPressurePerMille',
  'faminePressurePerMille',
  'warPressurePerMille',
] as const;

export type RegionPressureField = (typeof REGION_PRESSURE_FIELDS)[number];

export type RegionPressureSupport = 'supported' | 'not_supported_yet';

export interface RegionPressureSignalInput {
  readonly valuePerMille?: number | null;
  readonly support?: RegionPressureSupport | string | null;
  readonly source?: string | null;
}

export interface RegionPressureSignal {
  readonly valuePerMille: number;
  readonly support: RegionPressureSupport;
  readonly source: string;
}

export type RegionPressureSignalMap = Partial<Record<RegionPressureField, RegionPressureSignalInput>>;

export interface RegionPressurePlannerInput {
  readonly tick: number;
  readonly regionId: string;
  readonly chunkKeys: readonly string[];
  readonly observerChunkKey?: string | null;
  readonly distanceChunks?: number | null;
  readonly resourceSignals?: RegionPressureSignalMap | null;
  readonly marketSignals?: RegionPressureSignalMap | null;
  readonly npcSignals?: RegionPressureSignalMap | null;
  readonly governanceSignals?: RegionPressureSignalMap | null;
  readonly previousPressure?: Partial<RegionPressureState> | null;
}

export type RegionPressureValueMap = Record<RegionPressureField, RegionPressureSignal>;

export type RegionPressureState = RegionPressureValueMap & {
  readonly tick: number;
  readonly regionId: string;
  readonly chunkKeys: readonly string[];
  readonly lodTier: RegionLodTier;
  readonly aggregatePressurePerMille: number;
  readonly unsupportedFields: readonly RegionPressureField[];
  readonly stateHash: string;
};

export function isRegionLodTier(value: unknown): value is RegionLodTier {
  return typeof value === 'string' && REGION_LOD_TIERS.includes(value as RegionLodTier);
}

export function isRegionPressureField(value: unknown): value is RegionPressureField {
  return typeof value === 'string' && REGION_PRESSURE_FIELDS.includes(value as RegionPressureField);
}
