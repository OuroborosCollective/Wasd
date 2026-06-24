import { createARESeed, stableHash32 } from '../core/determinism/AREDeterminism';
import { createRegionLodState } from './RegionLodState';
import {
  REGION_PRESSURE_FIELDS,
  REGION_PRESSURE_KAPPA,
  REGION_PRESSURE_MAX_DELTA_PER_TICK,
  type RegionPressureField,
  type RegionPressurePlannerInput,
  type RegionPressureSignal,
  type RegionPressureSignalInput,
  type RegionPressureSignalMap,
  type RegionPressureState,
} from './RegionPressureTypes';

const SIGNAL_GROUPS = ['resource', 'market', 'npc', 'governance'] as const;
type SignalGroupName = (typeof SIGNAL_GROUPS)[number];

type SignalSources = Record<SignalGroupName, RegionPressureSignalMap | null | undefined>;

const FIELD_SOURCE_ORDER: Record<RegionPressureField, readonly SignalGroupName[]> = {
  resourcePressurePerMille: ['resource', 'market', 'npc', 'governance'],
  migrationPressurePerMille: ['npc', 'resource', 'market', 'governance'],
  tradePressurePerMille: ['market', 'resource', 'npc', 'governance'],
  threatPressurePerMille: ['npc', 'governance', 'resource', 'market'],
  faminePressurePerMille: ['resource', 'market', 'npc', 'governance'],
  warPressurePerMille: ['governance', 'npc', 'resource', 'market'],
} as const;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clampPerMille(value: unknown): number {
  if (!isFiniteNumber(value)) return 0;
  return Math.max(0, Math.min(REGION_PRESSURE_KAPPA, Math.trunc(value)));
}

function normalizeSource(source: unknown, fallback: string): string {
  const normalized = String(source ?? '').trim();
  return normalized.length > 0 ? normalized : fallback;
}

function capDelta(value: number, previousValue: number | undefined): number {
  if (!isFiniteNumber(previousValue)) return value;
  const previous = clampPerMille(previousValue);
  const delta = value - previous;
  if (Math.abs(delta) <= REGION_PRESSURE_MAX_DELTA_PER_TICK) return value;
  return clampPerMille(previous + Math.sign(delta) * REGION_PRESSURE_MAX_DELTA_PER_TICK);
}

function readSignal(field: RegionPressureField, sources: SignalSources): { signal: RegionPressureSignalInput | null; sourceName: string } {
  for (const sourceName of FIELD_SOURCE_ORDER[field]) {
    const signal = sources[sourceName]?.[field];
    if (signal) return { signal, sourceName };
  }

  return { signal: null, sourceName: 'not_supported_yet' };
}

function normalizeSignal(
  field: RegionPressureField,
  signal: RegionPressureSignalInput | null,
  sourceName: string,
  previousPressure: Partial<RegionPressureState> | null | undefined,
): RegionPressureSignal {
  if (!signal || signal.support !== 'supported') {
    return Object.freeze({
      valuePerMille: 0,
      support: 'not_supported_yet',
      source: normalizeSource(signal?.source, `${sourceName}:${field}`),
    });
  }

  const previousSignal = previousPressure?.[field] as RegionPressureSignal | undefined;
  const cappedValue = capDelta(clampPerMille(signal.valuePerMille), previousSignal?.valuePerMille);

  return Object.freeze({
    valuePerMille: cappedValue,
    support: 'supported',
    source: normalizeSource(signal.source, `${sourceName}:${field}`),
  });
}

function hashHex(parts: readonly unknown[]): string {
  return stableHash32(createARESeed(parts)).toString(16).padStart(8, '0');
}

export function planRegionPressure(input: RegionPressurePlannerInput): RegionPressureState {
  const lod = createRegionLodState({
    tick: input.tick,
    regionId: input.regionId,
    chunkKeys: input.chunkKeys,
    observerChunkKey: input.observerChunkKey,
    distanceChunks: input.distanceChunks,
  });

  const sources: SignalSources = {
    resource: input.resourceSignals,
    market: input.marketSignals,
    npc: input.npcSignals,
    governance: input.governanceSignals,
  };

  const values = {} as Record<RegionPressureField, RegionPressureSignal>;
  for (const field of REGION_PRESSURE_FIELDS) {
    const { signal, sourceName } = readSignal(field, sources);
    values[field] = normalizeSignal(field, signal, sourceName, input.previousPressure);
  }

  const unsupportedFields = Object.freeze(
    REGION_PRESSURE_FIELDS.filter((field) => values[field].support === 'not_supported_yet'),
  );

  const rawAggregate = REGION_PRESSURE_FIELDS.reduce(
    (sum, field) => sum + values[field].valuePerMille,
    0,
  ) / REGION_PRESSURE_FIELDS.length;

  const previousAggregate = input.previousPressure?.aggregatePressurePerMille;
  const aggregatePressurePerMille = capDelta(clampPerMille(rawAggregate), previousAggregate);

  const stateHash = hashHex([
    lod.tick,
    lod.regionId,
    lod.lodTier,
    lod.chunkKeys.join(','),
    ...REGION_PRESSURE_FIELDS.flatMap((field) => [
      field,
      values[field].valuePerMille,
      values[field].support,
      values[field].source,
    ]),
    aggregatePressurePerMille,
  ]);

  return Object.freeze({
    tick: lod.tick,
    regionId: lod.regionId,
    chunkKeys: lod.chunkKeys,
    lodTier: lod.lodTier,
    ...values,
    aggregatePressurePerMille,
    unsupportedFields,
    stateHash,
  });
}
