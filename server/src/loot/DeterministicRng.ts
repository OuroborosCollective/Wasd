'use strict';

const crypto = require('node:crypto');

class DeterministicRng {
  private state: number;

  constructor(seed: string) {
    const hash = crypto.createHash('sha256').update(String(seed)).digest();
    this.state = hash.readUInt32LE(0) || 0x9e3779b9;
  }

  nextU32(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  float01(): number {
    return this.nextU32() / 0xffffffff;
  }

  int(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new Error(`INVALID_RNG_RANGE:${min}:${max}`);
    }
    return min + (this.nextU32() % (max - min + 1));
  }

  pick<T>(list: T[]): T | null {
    if (!Array.isArray(list) || list.length === 0) return null;
    return list[this.int(0, list.length - 1)];
  }

  weightedPick<T>(items: T[], weightKey = 'weight'): T | null {
    if (!Array.isArray(items) || items.length === 0) return null;

    const weights = items.map((item: any) => {
      const value = Number(item[weightKey]);
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
    });

    const total = weights.reduce((a, b) => a + b, 0);
    let roll = this.int(1, total);

    for (let i = 0; i < items.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return items[i];
    }

    return items[items.length - 1];
  }
}

export { DeterministicRng };