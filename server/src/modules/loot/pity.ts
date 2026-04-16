export function pityBonus(streak: number, step = 0.002, cap = 0.08): number {
  return Math.min(cap, Math.max(0, streak) * step);
}
