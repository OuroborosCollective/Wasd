// @ARE-GUARD-EXEMPT: Deterministic PRNG for 10 Hz warfront combat (no Math.random).
/** Deterministic PRNG for 10 Hz warfront combat (no Math.random). */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function warfrontSeed(tick: number, salt: string): number {
  let h = tick ^ 0x9e3779b9;
  for (let i = 0; i < salt.length; i++) {
    h = Math.imul(31, h) + salt.charCodeAt(i);
  }
  return h >>> 0;
}
