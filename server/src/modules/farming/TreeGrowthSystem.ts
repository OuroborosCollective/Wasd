export class TreeGrowthSystem {
  grow(tree: any, tick: number) {
    tree.stage = Math.min((tree.stage || 0) + 1, 4);
    tree.lastGrowthAt = tick;
    return tree;
  }
}