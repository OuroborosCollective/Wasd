import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

export class TreeGrowthSystem {
  constructor(private readonly clock: AREClock = new SystemAREClock()) {}

  grow(tree: any) {
    tree.stage = Math.min((tree.stage || 0) + 1, 4);
    tree.lastGrowthAt = this.clock.now();
    return tree;
  }
}