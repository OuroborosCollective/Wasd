import { createHash } from 'node:crypto';

export const ARE_SIMULATION_TICK_HZ = 10;
export const ARE_SIMULATION_TICK_MS = 1000 / ARE_SIMULATION_TICK_HZ;

export function msToARETicks(ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return 1;
  return Math.max(1, Math.ceil(ms / ARE_SIMULATION_TICK_MS));
}

export function areTicksToMs(ticks: number): number {
  if (!Number.isFinite(ticks) || ticks <= 0) return 0;
  return Math.trunc(ticks) * ARE_SIMULATION_TICK_MS;
}

export interface AREClock {
  now(): number;
}

export interface ARERng {
  nextFloat(): number;
  nextInt(maxExclusive: number): number;
  nextRange(minInclusive: number, maxInclusive: number): number;
  fork(label: string): ARERng;
}

/**
 * Canonical key for a stateless ARE pseudo-random sample.
 *
 * Every sample is derived only from this explicit key. There is no cursor,
 * hidden sequence counter, wall-clock input, or prior RNG consumption.
 * `lane` names independent decisions inside the same action (for example
 * `hit`, `critical`, `pellet:7`, or `loot:iron:amount`).
 */
export interface AREStatelessRandomKey {
  readonly worldSeed: string | number | bigint;
  readonly tick: number | string | bigint;
  readonly channel: string;
  readonly chunkKey?: string;
  readonly actorId?: string;
  readonly targetId?: string;
  readonly actionId?: string;
  readonly lane?: string;
  readonly counter?: number;
}

export class SystemAREClock implements AREClock {
  constructor(private readonly tickNow = 0) {}

  now(): number {
    return this.tickNow;
  }
}

export class FixedAREClock implements AREClock {
  constructor(private readonly fixedNow: number) {}

  now(): number {
    return this.fixedNow;
  }
}

/**
 * Deterministic sequence RNG for local algorithms that intentionally consume
 * an ordered sequence. Canonical truth paths that need evaluation-order
 * independence should prefer statelessAREFloat/statelessAREInt below.
 */
export class SeededARERng implements ARERng {
  private state: number;

  constructor(seed: string | number) {
    this.state = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
    if (this.state === 0) this.state = 0x6d2b79f5;
  }

  nextFloat(): number {
    let next = this.state += 0x6d2b79f5;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(maxExclusive: number): number {
    if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) return 0;
    return Math.floor(this.nextFloat() * Math.floor(maxExclusive));
  }

  nextRange(minInclusive: number, maxInclusive: number): number {
    const min = Math.ceil(minInclusive);
    const max = Math.floor(maxInclusive);
    if (max <= min) return min;
    return min + this.nextInt(max - min + 1);
  }

  fork(label: string): ARERng {
    return new SeededARERng(`${this.state.toString(36)}:${label}`);
  }
}

export function createARESeed(parts: readonly unknown[]): string {
  return parts.map((part) => stablePart(part)).join('|');
}

export function deterministicNow(seed: string | number | bigint = 0): number {
  if (typeof seed === 'bigint') return Number(seed);
  if (typeof seed === 'number') return Number.isFinite(seed) ? Math.trunc(seed) : 0;
  return hashSeed(seed);
}

export function deterministicRandom(seed: string | number | bigint = 0): number {
  return new SeededARERng(typeof seed === 'bigint' ? seed.toString() : seed).nextFloat();
}

export function stableHash32(seed: string | number | bigint): number {
  return hashSeed(String(seed));
}

/**
 * SHA-256 digest of a canonical stateless-random key.
 *
 * The digest is useful as evidence/debug material when a deterministic roll
 * needs to be reproduced independently. It is not an authorization token and
 * must not be treated as a secret.
 */
export function deriveAREStatelessRandomDigest(key: AREStatelessRandomKey): string {
  return createHash('sha256')
    .update('are-stateless-rng-v1\0')
    .update(encodeStatelessRandomKey(key))
    .digest('hex');
}

/**
 * Pure deterministic sample in [0, 1). Re-evaluating the same key always
 * yields the same value, irrespective of which other samples were evaluated
 * before or after it.
 */
export function statelessAREFloat(key: AREStatelessRandomKey): number {
  const digest = deriveAREStatelessRandomDigest(key);
  // Use the first 53 bits so the conversion is exactly representable by a JS
  // number. 13 hex digits provide 52 bits; the result remains in [0, 1).
  const numerator = Number.parseInt(digest.slice(0, 13), 16);
  return numerator / 0x10000000000000;
}

/**
 * Pure deterministic integer in [0, maxExclusive).
 */
export function statelessAREInt(key: AREStatelessRandomKey, maxExclusive: number): number {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error('maxExclusive must be a positive safe integer');
  }
  return Math.floor(statelessAREFloat(key) * maxExclusive);
}

function encodeStatelessRandomKey(key: AREStatelessRandomKey): string {
  const counter = key.counter ?? 0;
  if (!Number.isSafeInteger(counter) || counter < 0) {
    throw new Error('counter must be a non-negative safe integer');
  }
  if (!key.channel || typeof key.channel !== 'string') {
    throw new Error('channel must be a non-empty deterministic identifier');
  }

  const fields: readonly [string, string][] = [
    ['worldSeed', scalarKeyPart(key.worldSeed)],
    ['tick', scalarKeyPart(key.tick)],
    ['channel', key.channel],
    ['chunkKey', key.chunkKey ?? ''],
    ['actorId', key.actorId ?? ''],
    ['targetId', key.targetId ?? ''],
    ['actionId', key.actionId ?? ''],
    ['lane', key.lane ?? ''],
    ['counter', String(counter)],
  ];

  // Length prefixes make the encoding unambiguous even when identifiers
  // themselves contain punctuation or delimiter-like characters.
  return fields
    .map(([name, value]) => `${name.length}:${name}${value.length}:${value}`)
    .join('');
}

function scalarKeyPart(value: string | number | bigint): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('stateless random key contains a non-finite number');
    }
    if (!Number.isSafeInteger(value)) {
      throw new Error('numeric stateless random key parts must be safe integers');
    }
    return `number:${Object.is(value, -0) ? '-0' : String(value)}`;
  }
  if (typeof value === 'bigint') return `bigint:${value.toString()}`;
  return `string:${value}`;
}

function stablePart(part: unknown): string {
  if (part === null) return 'null';
  if (part === undefined) return 'undefined';
  if (typeof part === 'string' || typeof part === 'number' || typeof part === 'boolean') {
    return String(part);
  }
  try {
    return JSON.stringify(part, Object.keys(part as Record<string, unknown>).sort());
  } catch {
    return String(part);
  }
}

function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}
