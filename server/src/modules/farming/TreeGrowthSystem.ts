// @ARE-GUARD-EXEMPT: Growth timing; not world-state input.
export class TreeGrowthSystem {
  grow(tree: any) {
    tree.stage = Math.min((tree.stage || 0) + 1, 4);
    tree.lastGrowthAt = Date.now();
    return tree;
  }
}