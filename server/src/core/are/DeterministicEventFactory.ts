/**
 * DeterministicEventFactory - ARE-compliant event creation utilities.
 *
 * These utilities ensure that events are created deterministically based on:
 * - tick (logical time, not wall-clock)
 * - localIndex (per-tick event sequence number)
 * - stateHash (world state fingerprint)
 * - dataHash (event data fingerprint)
 *
 * NO Date.now(), NO Math.random(), NO crypto.randomUUID() in this file.
 */

import { createHash } from "node:crypto";
import type { TickId } from "./types.js";
import { GENESIS_STATE_HASH } from "./types.js";

/** 10 Hz tick rate */
export const TICK_MS = 100;

export interface DeterministicEventContext {
  readonly tick: TickId | number;
  readonly localIndex: number;
  readonly stateHash?: string;
}

export interface WorldEventInput<TData = unknown> {
  readonly type: string;
  readonly actorId?: string;
  readonly targetId?: string;
  readonly chunkKey?: string;
  readonly data: TData;
}

/** Stable stringify using canonicalize for deterministic output */
export function stableStringify(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "nan";
    return String(value);
  }
  if (typeof value === "boolean") return String(value);
  if (typeof value === "string") return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const pairs = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
    return `{${pairs.join(",")}}`;
  }

  return JSON.stringify(value);
}

/** Deterministic hash using SHA-256 */
export function deterministicHash(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Create deterministic data hash from event data */
export function hashData<TData>(data: TData): string {
  return deterministicHash(stableStringify(data));
}

/**
 * Create a deterministic event ID from context and input.
 *
 * ID derivation: SHA-256 of stableStringify({ type, tick, localIndex, actorId, targetId, chunkKey, dataHash, stateHash })
 */
export function createDeterministicEventId(
  type: string,
  tick: number,
  localIndex: number,
  actorId: string,
  targetId: string,
  chunkKey: string,
  dataHash: string,
  stateHash: string,
): string {
  const idInput = {
    type,
    tick,
    localIndex,
    actorId: actorId || "",
    targetId: targetId || "",
    chunkKey: chunkKey || "",
    dataHash,
    stateHash: stateHash || GENESIS_STATE_HASH,
  };
  return deterministicHash(stableStringify(idInput)).slice(0, 32);
}

/**
 * Create a deterministic world event.
 *
 * All fields derive deterministically from tick context and input data.
 * No wall-clock time, no random values.
 */
export function createDeterministicEvent<TData>(
  input: WorldEventInput<TData>,
  context: DeterministicEventContext,
): Readonly<{
  id: string;
  type: string;
  tick: number;
  localIndex: number;
  logicalTimeMs: number;
  actorId: string;
  targetId: string;
  chunkKey: string;
  data: TData;
  dataHash: string;
  stateHash: string;
}> {
  const tick = typeof context.tick === "number" ? context.tick : Number(context.tick);
  const localIndex = context.localIndex;
  const stateHash = context.stateHash || GENESIS_STATE_HASH;
  const dataHash = hashData(input.data);

  const id = createDeterministicEventId(
    input.type,
    tick,
    localIndex,
    input.actorId || "",
    input.targetId || "",
    input.chunkKey || "",
    dataHash,
    stateHash,
  );

  return Object.freeze({
    id,
    type: input.type,
    tick,
    localIndex,
    logicalTimeMs: tick * TICK_MS,
    actorId: input.actorId || "",
    targetId: input.targetId || "",
    chunkKey: input.chunkKey || "",
    data: input.data,
    dataHash,
    stateHash,
  });
}

/**
 * Stable entity key extraction for deterministic sorting.
 * Returns the entity's id if available, otherwise hashes the entire entity.
 */
export function stableEntityKey(value: unknown): string {
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    if (typeof record.id === "string" && record.id.length > 0) {
      return record.id;
    }
  }
  return deterministicHash(stableStringify(value)).slice(0, 16);
}

/**
 * Stable sort with deterministic ordering by entity key.
 */
export function stableSort<T>(items: readonly T[]): readonly T[] {
  return [...items].sort((a, b) => stableEntityKey(a).localeCompare(stableEntityKey(b)));
}
