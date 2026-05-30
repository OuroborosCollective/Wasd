import { assertInteger } from "./KappaMath";

export type ARESeed = string & { readonly __brand: "ARESeed" };

/**
 * SeededARERng is a deterministic integer PRNG for shared server/client world truth.
 * It uses FNV-1a seed hashing plus xorshift32 stepping. No ambient entropy is read.
 */
export class SeededARERng {
  private state: number;

  public constructor(seed: ARESeed | string) {
    this.state = SeededARERng.hashSeed(seed);
    if (this.state === 0) this.state = 0x6d2b79f5;
  }

  public static compose(parts: readonly (string | number)[]): ARESeed {
    return parts.map((part) => String(part)).join("|") as ARESeed;
  }

  public static hashSeed(seed: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < seed.length; i += 1) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
  }

  public fork(label: string | number): SeededARERng {
    return new SeededARERng(SeededARERng.compose([this.state, label]));
  }

  public nextU32(): number {
    let x = this.state >>> 0;
    x ^= (x << 13) >>> 0;
    x ^= x >>> 17;
    x ^= (x << 5) >>> 0;
    this.state = x >>> 0;
    return this.state;
  }

  public intInclusive(min: number, max: number): number {
    assertInteger(min, "min");
    assertInteger(max, "max");
    if (min > max) throw new Error("min cannot exceed max");
    const range = max - min + 1;
    return min + (this.nextU32() % range);
  }

  public chancePerMille(threshold: number): boolean {
    assertInteger(threshold, "threshold");
    if (threshold <= 0) return false;
    if (threshold >= 1000) return true;
    return this.intInclusive(0, 999) < threshold;
  }

  public pickIndex(length: number): number {
    assertInteger(length, "length");
    if (length <= 0) throw new Error("cannot pick from empty array");
    return this.nextU32() % length;
  }
}
