/** Scale affix roll ranges by item level (simple +0..+50% spread). */
export function scaleRoll(min: number, max: number, ilvl: number): { min: number; max: number } {
  const k = Math.min(1, Math.max(0, (ilvl - 1) / 99));
  const mult = 1 + 0.5 * k;
  return { min: Math.floor(min * mult), max: Math.floor(max * mult) };
}
