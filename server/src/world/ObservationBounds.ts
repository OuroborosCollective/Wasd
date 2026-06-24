import { assertValidChunkCoord, UNIFIED_CHUNK_CONTRACT } from '../core/spatial/UnifiedChunkContract';
import type { RegionLodTier } from './RegionPressureTypes';
import { isRegionLodTier } from './RegionPressureTypes';

export interface ChunkCoordinate {
  readonly x: number;
  readonly y: number;
}

export interface ObservationBoundsInput {
  readonly observerChunkKey?: string | null;
  readonly chunkKeys: readonly string[];
  readonly distanceChunks?: number | null;
}

export interface ObservationBounds {
  readonly chunkKeys: readonly string[];
  readonly minimumDistanceChunks: number;
  readonly lodTier: RegionLodTier;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function normalizeChunkKey(chunkKey: unknown): string {
  return String(chunkKey ?? '').trim();
}

export function normalizeChunkKeys(chunkKeys: readonly unknown[]): readonly string[] {
  return Object.freeze([...new Set(chunkKeys.map(normalizeChunkKey).filter(Boolean))].sort());
}

export function parseChunkKey(chunkKey: string): ChunkCoordinate | null {
  const [xText, yText] = normalizeChunkKey(chunkKey).split(':');
  if (xText === undefined || yText === undefined) return null;

  const x = Number(xText);
  const y = Number(yText);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;

  assertValidChunkCoord(x, 'ObservationBounds.parseChunkKey.x');
  assertValidChunkCoord(y, 'ObservationBounds.parseChunkKey.y');

  return Object.freeze({ x, y });
}

export function chunkDistanceChunks(a: ChunkCoordinate, b: ChunkCoordinate): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function classifyObservation(distanceChunks: number): RegionLodTier {
  if (!Number.isFinite(distanceChunks) || distanceChunks < 0) return 'sleeping_region';

  const distance = Math.trunc(distanceChunks);
  if (distance <= UNIFIED_CHUNK_CONTRACT.broadcastRadiusChunks) return 'observed_chunk';
  if (distance <= UNIFIED_CHUNK_CONTRACT.simulationRadiusChunks) return 'near_chunk';
  if (distance <= UNIFIED_CHUNK_CONTRACT.simulationRadiusChunks * 4) return 'region_summary';

  return 'sleeping_region';
}

export function createObservationBounds(input: ObservationBoundsInput): ObservationBounds {
  const chunkKeys = normalizeChunkKeys(input.chunkKeys ?? []);
  const explicitDistance = isFiniteNumber(input.distanceChunks)
    ? Math.max(0, Math.trunc(input.distanceChunks))
    : null;

  let minimumDistanceChunks = explicitDistance ?? Number.POSITIVE_INFINITY;
  const observer = input.observerChunkKey ? parseChunkKey(input.observerChunkKey) : null;

  if (explicitDistance === null && observer) {
    for (const chunkKey of chunkKeys) {
      const coordinate = parseChunkKey(chunkKey);
      if (!coordinate) continue;
      minimumDistanceChunks = Math.min(minimumDistanceChunks, chunkDistanceChunks(observer, coordinate));
    }
  }

  if (!Number.isFinite(minimumDistanceChunks)) {
    minimumDistanceChunks = chunkKeys.length > 0 ? UNIFIED_CHUNK_CONTRACT.simulationRadiusChunks * 4 : -1;
  }

  const lodTier = classifyObservation(minimumDistanceChunks);
  if (!isRegionLodTier(lodTier)) {
    throw new Error(`[ObservationBounds] Invalid LOD tier: ${String(lodTier)}`);
  }

  return Object.freeze({
    chunkKeys,
    minimumDistanceChunks,
    lodTier,
  });
}
