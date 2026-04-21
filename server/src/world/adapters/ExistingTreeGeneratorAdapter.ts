/**
 * ExistingTreeGeneratorAdapter — Wraps the existing TreeGenerator integration.
 * Provides vegetation exclusion, removal, and regrowth management
 * to the WorldPlacementRuleEngine.
 *
 * Vegetation zones are tracked as exclusion circles.
 * When a building is placed, trees in its exclusion zone are removed.
 * When a building is removed, trees can optionally regrow.
 */

import type { VegetationExclusionAdapter } from "../services/WorldPlacementRuleEngine.js";

export interface VegetationExclusionZone {
  id: string;
  x: number;
  y: number;
  radius: number;
  reason: string; // "building", "road", "wall", "gate", "dungeon", "manual"
  permanent: boolean;
  createdAt: number;
}

export interface TreeInstance {
  id: string;
  x: number;
  y: number;
  z: number;
  type: "tree" | "bush" | "pine" | "foliage";
  scale: number;
  rotation: number;
  removed: boolean;
  removedReason?: string;
}

export class ExistingTreeGeneratorAdapter implements VegetationExclusionAdapter {
  private exclusions: Map<string, VegetationExclusionZone> = new Map();
  private trees: Map<string, TreeInstance> = new Map();
  private treeCounter = 0;
  private onTreeRemoved: ((treeId: string, reason: string) => void) | null = null;
  private onTreePlaced: ((tree: TreeInstance) => void) | null = null;

  // ── VegetationExclusionAdapter interface ──────────────────────────────

  async excludeArea(id: string, x: number, y: number, radius: number): Promise<void> {
    this.exclusions.set(id, {
      id,
      x,
      y,
      radius,
      reason: "building",
      permanent: false,
      createdAt: Date.now(),
    });

    // Remove conflicting trees
    await this.removeTreesInRadius(x, y, radius, `exclusion:${id}`);
  }

  async removeExclusion(id: string): Promise<void> {
    const exclusion = this.exclusions.get(id);
    if (!exclusion) return;

    // Optionally regrow trees in this area
    if (!exclusion.permanent) {
      this.scheduleRegrowth(exclusion);
    }

    this.exclusions.delete(id);
  }

  isExcluded(x: number, y: number): boolean {
    for (const zone of this.exclusions.values()) {
      const dist = Math.hypot(x - zone.x, y - zone.y);
      if (dist < zone.radius) return true;
    }
    return false;
  }

  // ── Public API ────────────────────────────────────────────────────────

  /** Register a tree instance. */
  registerTree(tree: Omit<TreeInstance, "id" | "removed">): string {
    const id = `tree-${++this.treeCounter}`;
    this.trees.set(id, { ...tree, id, removed: false });

    // Check if this tree is in an exclusion zone
    if (this.isExcluded(tree.x, tree.y)) {
      const treeInst = this.trees.get(id)!;
      treeInst.removed = true;
      treeInst.removedReason = "exclusion_zone";
      if (this.onTreeRemoved) this.onTreeRemoved(id, "exclusion_zone");
    }

    return id;
  }

  /** Get all active (non-removed) trees. */
  getActiveTrees(): TreeInstance[] {
    return Array.from(this.trees.values()).filter((t) => !t.removed);
  }

  /** Get all removed trees (for potential regrowth). */
  getRemovedTrees(): TreeInstance[] {
    return Array.from(this.trees.values()).filter((t) => t.removed);
  }

  /** Get all exclusion zones. */
  getExclusionZones(): VegetationExclusionZone[] {
    return Array.from(this.exclusions.values());
  }

  /** Set exclusion with specific reason. */
  addExclusion(id: string, x: number, y: number, radius: number, reason: string, permanent = false): void {
    this.exclusions.set(id, { id, x, y, radius, reason, permanent, createdAt: Date.now() });
    this.removeTreesInRadius(x, y, radius, reason);
  }

  /** Add exclusion for a road segment. */
  addRoadExclusion(roadId: string, x: number, y: number, width: number, depth: number, buffer: number): void {
    const radius = Math.max(width, depth) / 2 + buffer;
    this.addExclusion(`road-${roadId}`, x, y, radius, "road", true);
  }

  /** Add exclusion for a wall segment. */
  addWallExclusion(wallId: string, x: number, y: number, buffer: number): void {
    this.addExclusion(`wall-${wallId}`, x, y, buffer, "wall", false);
  }

  /** Add exclusion for a gate. */
  addGateExclusion(gateId: string, x: number, y: number, buffer: number): void {
    this.addExclusion(`gate-${gateId}`, x, y, buffer, "gate", false);
  }

  /** Generate trees for a region, respecting exclusions. */
  generateTreesForRegion(
    regionX: number,
    regionY: number,
    regionWidth: number,
    regionDepth: number,
    density: number,
    treeTypes: Array<"tree" | "bush" | "pine"> = ["tree", "pine"]
  ): TreeInstance[] {
    const placed: TreeInstance[] = [];
    const spacing = 1 / Math.sqrt(density);

    for (let x = regionX; x < regionX + regionWidth; x += spacing) {
      for (let y = regionY; y < regionY + regionDepth; y += spacing) {
        // Random offset
        const px = x + (Math.random() - 0.5) * spacing;
        const py = y + (Math.random() - 0.5) * spacing;

        if (this.isExcluded(px, py)) continue;

        const type = treeTypes[Math.floor(Math.random() * treeTypes.length)];
        const tree: TreeInstance = {
          id: `tree-${++this.treeCounter}`,
          x: px,
          y: py,
          z: 0,
          type,
          scale: 0.7 + Math.random() * 0.6,
          rotation: Math.random() * Math.PI * 2,
          removed: false,
        };
        this.trees.set(tree.id, tree);
        placed.push(tree);

        if (this.onTreePlaced) this.onTreePlaced(tree);
      }
    }

    return placed;
  }

  /** Remove all trees in a circular area. */
  async removeTreesInRadius(x: number, y: number, radius: number, reason: string): Promise<number> {
    let removed = 0;
    for (const tree of this.trees.values()) {
      if (tree.removed) continue;
      const dist = Math.hypot(tree.x - x, tree.y - y);
      if (dist < radius) {
        tree.removed = true;
        tree.removedReason = reason;
        removed++;
        if (this.onTreeRemoved) this.onTreeRemoved(tree.id, reason);
      }
    }
    return removed;
  }

  /** Count trees in a region. */
  countTreesInRegion(x: number, y: number, radius: number): { active: number; removed: number } {
    let active = 0;
    let removed = 0;
    for (const tree of this.trees.values()) {
      const dist = Math.hypot(tree.x - x, tree.y - y);
      if (dist < radius) {
        if (tree.removed) removed++;
        else active++;
      }
    }
    return { active, removed };
  }

  /** Set callback for tree removal events. */
  onTreeRemovedCallback(cb: (treeId: string, reason: string) => void): void {
    this.onTreeRemoved = cb;
  }

  /** Set callback for tree placement events. */
  onTreePlacedCallback(cb: (tree: TreeInstance) => void): void {
    this.onTreePlaced = cb;
  }

  /** Clear all data. */
  clear(): void {
    this.exclusions.clear();
    this.trees.clear();
    this.treeCounter = 0;
  }

  private scheduleRegrowth(zone: VegetationExclusionZone): void {
    // Find trees that were removed due to this zone and restore them
    for (const tree of this.trees.values()) {
      if (tree.removed && tree.removedReason === `exclusion:${zone.id}`) {
        // Check if tree is still in another exclusion zone
        if (!this.isExcludedExcluding(tree.x, tree.y, zone.id)) {
          tree.removed = false;
          tree.removedReason = undefined;
          if (this.onTreePlaced) this.onTreePlaced(tree);
        }
      }
    }
  }

  private isExcludedExcluding(x: number, y: number, excludeZoneId: string): boolean {
    for (const zone of this.exclusions.values()) {
      if (zone.id === excludeZoneId) continue;
      const dist = Math.hypot(x - zone.x, y - zone.y);
      if (dist < zone.radius) return true;
    }
    return false;
  }
}
