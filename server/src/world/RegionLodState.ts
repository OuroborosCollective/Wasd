import { createARESeed, stableHash32 } from '../core/determinism/AREDeterminism';
import { createObservationBounds } from './ObservationBounds';
import type { RegionLodTier } from './RegionPressureTypes';

export interface RegionLodStateInput {
  readonly tick: number;
  readonly regionId: string;
  readonly chunkKeys: readonly string[];
  readonly observerChunkKey?: string | null;
  readonly distanceChunks?: number | null;
}

export interface RegionLodState {
  readonly tick: number;
  readonly regionId: string;
  readonly chunkKeys: readonly string[];
  readonly minimumDistanceChunks: number;
  readonly lodTier: RegionLodTier;
  readonly lodHash: string;
}

function normalizeTick(tick: number): number {
  return Number.isSafeInteger(tick) && tick >= 0 ? tick : 0;
}

function normalizeRegionId(regionId: string): string {
  const normalized = String(regionId ?? '').trim();
  return normalized.length > 0 ? normalized : 'unknown_region';
}

function hashHex(parts: readonly unknown[]): string {
  return stableHash32(createARESeed(parts)).toString(16).padStart(8, '0');
}

export function createRegionLodState(input: RegionLodStateInput): RegionLodState {
  const tick = normalizeTick(input.tick);
  const regionId = normalizeRegionId(input.regionId);
  const bounds = createObservationBounds({
    observerChunkKey: input.observerChunkKey,
    chunkKeys: input.chunkKeys,
    distanceChunks: input.distanceChunks,
  });

  return Object.freeze({
    tick,
    regionId,
    chunkKeys: bounds.chunkKeys,
    minimumDistanceChunks: bounds.minimumDistanceChunks,
    lodTier: bounds.lodTier,
    lodHash: hashHex([tick, regionId, bounds.lodTier, bounds.minimumDistanceChunks, bounds.chunkKeys.join(',')]),
  });
}
