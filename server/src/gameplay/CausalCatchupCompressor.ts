import { createARESeed, stableHash32 } from '../core/determinism/AREDeterminism';
import {
  isCausalCatchupEventType,
  type CausalCatchupEvent,
  type CausalCatchupEventInput,
  type CausalCatchupSummary,
} from './CausalCatchupTypes';

function clampPerMille(value: unknown): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1000, Math.trunc(Number(value))));
}

function normalizeTick(value: unknown): number | null {
  if (!Number.isSafeInteger(value) || Number(value) < 0) return null;
  return Number(value);
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function hashHex(parts: readonly unknown[]): string {
  return stableHash32(createARESeed(parts)).toString(16).padStart(8, '0');
}

function normalizeEvent(event: CausalCatchupEventInput): CausalCatchupEvent | null {
  const eventId = normalizeText(event.eventId);
  const tick = normalizeTick(event.tick);

  if (!eventId || tick === null || !isCausalCatchupEventType(event.type)) return null;

  const significancePerMille = clampPerMille(event.significancePerMille);
  const regionId = normalizeText(event.regionId);
  const chunkKey = normalizeText(event.chunkKey);
  const payloadHash = normalizeText(event.payloadHash);
  const eventHash = hashHex([
    eventId,
    event.type,
    tick,
    significancePerMille,
    regionId,
    chunkKey,
    payloadHash,
  ]);

  return Object.freeze({
    eventId,
    type: event.type,
    tick,
    significancePerMille,
    regionId,
    chunkKey,
    payloadHash,
    eventHash,
  });
}

export function compressCausalCatchup(events: readonly CausalCatchupEventInput[]): CausalCatchupSummary {
  const normalized = Object.freeze(
    (events ?? [])
      .map(normalizeEvent)
      .filter((event): event is CausalCatchupEvent => event !== null)
      .sort((a, b) => a.tick - b.tick || b.significancePerMille - a.significancePerMille || a.eventId.localeCompare(b.eventId)),
  );

  if (normalized.length === 0) {
    return Object.freeze({
      eventCount: 0,
      firstTick: null,
      lastTick: null,
      events: Object.freeze([]),
      summaryHash: '00000000',
    });
  }

  return Object.freeze({
    eventCount: normalized.length,
    firstTick: normalized[0].tick,
    lastTick: normalized[normalized.length - 1].tick,
    events: normalized,
    summaryHash: hashHex(normalized.flatMap((event) => [
      event.eventId,
      event.type,
      event.tick,
      event.significancePerMille,
      event.regionId,
      event.chunkKey,
      event.payloadHash,
      event.eventHash,
    ])),
  });
}
