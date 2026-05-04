// @ts-nocheck
/**
 * AgentNeeds — drives NPC agent behavior through a need hierarchy.
 *
 * Needs decay over time and are restored by agent actions.
 * The most urgent unmet need drives goal selection.
 */

export interface NeedSet {
  /** Physical safety: drops in combat zones, rises at safe locations. */
  safety: number;
  /** Resource needs: gold, items, equipment. Drops when poor. */
  resources: number;
  /** Social belonging: rises near allies/friends, drops in isolation. */
  belonging: number;
  /** Status/prestige: rises with reputation, kills, trade success. */
  status: number;
  /** Wealth accumulation: similar to resources but long-term. */
  wealth: number;
  /** Power/influence: faction rank, territory control. */
  power: number;
}

export function defaultNeeds(): NeedSet {
  return { safety: 0.8, resources: 0.5, belonging: 0.4, status: 0.3, wealth: 0.3, power: 0.2 };
}

const DECAY_RATES: NeedSet = {
  safety: 0.001,
  resources: 0.002,
  belonging: 0.001,
  status: 0.0005,
  wealth: 0.0003,
  power: 0.0002,
};

/** Decay all needs by one tick interval. */
export function decayNeeds(needs: NeedSet): void {
  for (const key of Object.keys(DECAY_RATES) as (keyof NeedSet)[]) {
    needs[key] = Math.max(0, needs[key] - DECAY_RATES[key]);
  }
}

/** Restore a need by a delta, clamped to [0, 1]. */
export function restoreNeed(needs: NeedSet, need: keyof NeedSet, delta: number): void {
  needs[need] = Math.min(1.0, Math.max(0, needs[need] + delta));
}

/** Return the most urgent (lowest) need. */
export function mostUrgentNeed(needs: NeedSet): keyof NeedSet {
  let lowestKey: keyof NeedSet = "safety";
  let lowestVal = needs.safety;
  for (const key of Object.keys(needs) as (keyof NeedSet)[]) {
    if (needs[key] < lowestVal) {
      lowestVal = needs[key];
      lowestKey = key;
    }
  }
  return lowestKey;
}

/** Map a need to potential goal categories. */
export function needToGoalCategory(need: keyof NeedSet): string {
  const map: Record<keyof NeedSet, string> = {
    safety: "seek_safety",
    resources: "gather_resources",
    belonging: "socialize",
    status: "gain_reputation",
    wealth: "trade",
    power: "expand_influence",
  };
  return map[need];
}
