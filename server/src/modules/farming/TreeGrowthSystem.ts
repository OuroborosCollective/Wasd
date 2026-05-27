import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

/**
 * TreeGrowthSystem handles the progression of tree growth stages.
 *
 * CAUSALITY: By using AREClock.now() instead of Date.now, we ensure that
 * tree maturation is deterministic and reproducible. Wall-clock leaks here
 * would cause WorldHash divergence during simulation replays.
 */
export class TreeGrowthSystem {
  constructor(private readonly clock: AREClock = new SystemAREClock()) {}

  grow(tree: any) {
    tree.stage = Math.min((tree.stage || 0) + 1, 4);
    tree.lastGrowthAt = this.clock.now();
    return tree;
  }
}
