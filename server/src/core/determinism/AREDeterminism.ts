import {
  ARE_SIMULATION_TICK_HZ,
  ARE_SIMULATION_TICK_MS,
  areTicksToMs,
  msToARETicks,
} from '@wasd/shared';

export {
  ARE_SIMULATION_TICK_HZ,
  ARE_SIMULATION_TICK_MS,
  areTicksToMs,
  msToARETicks,
};

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
 * Deterministic simulation clock.
 *
 * The historical class name is kept for compatibility, but it intentionally no
 * longer reads wall-clock time. Simulation code must derive time from tick/seed
 * input so replays and CI checks stay stable.
 */
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
 * Small deterministic PRNG for server simulation paths.
 *
 * This uses a 32-bit FNV-1a seed and Mulberry32 step. It is intended for
 * reproducible gameplay decisions, not cryptography or security tokens.
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
