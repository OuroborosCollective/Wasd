import { ResourceScatter } from "./ResourceScatter.js";
import { ItemRegistry } from "../inventory/ItemRegistry.js";
import { SeededARERng } from "../../core/determinism/AREDeterminism.js";

export interface ResourceNode {
  id: string;
  type: string; // e.g., 'tree', 'rock'
  position: { x: number, y: number };
  amount: number;
  maxAmount: number;
  regrowRate: number; // Ticks needed to regrow 1 amount
  regrowTimer: number; // Current timer for regrowth
  yields: string; // itemId it yields
  glbPath?: string; // Cached GLB path
}

export class ResourceSystem {
  public nodes: Map<string, ResourceNode> = new Map();
  // ⚡ Bolt Optimization: Cache resource nodes as an array to avoid repeated Array.from() allocations in the 10Hz world tick loop
  private cachedNodes: ResourceNode[] = [];
  public scatter: ResourceScatter;

  constructor() {
    this.scatter = new ResourceScatter();
  }

  initializeNodes() {
    // Generate some default nodes across the map
    const biomes = ["forest", "mountain", "desert"];
    const rng = new SeededARERng("resource-system:v1");
    let idCounter = 0;

    for (let i = 0; i < 50; i++) {
      const biome = biomes[rng.nextInt(biomes.length)];
      const resources = this.scatter.generateForBiome(biome);

      if (resources.length === 0) continue;

      const resourceType = resources[rng.nextInt(resources.length)];

      // Determine node properties based on type
      let typeName = "node";
      let maxAmount = 5;
      let regrowRate = 300; // 30s per unit

      if (resourceType === "wood" || resourceType === "berries") {
        typeName = resourceType === "wood" ? "tree" : "bush";
        maxAmount = resourceType === "wood" ? 10 : 3;
        regrowRate = resourceType === "wood" ? 600 : 200;
      } else if (resourceType === "stone" || resourceType === "iron" || resourceType === "crystals" || resourceType === "salt") {
        typeName = "rock";
        maxAmount = resourceType === "iron" ? 3 : 8;
        regrowRate = resourceType === "iron" ? 1200 : 400;
      }

      const id = `resource_${idCounter++}`;
      this.nodes.set(id, {
        id,
        type: typeName,
        position: {
          x: (rng.nextFloat() - 0.5) * 400, // spread across -200 to 200
          y: (rng.nextFloat() - 0.5) * 400
        },
        amount: maxAmount,
        maxAmount,
        regrowRate,
        regrowTimer: 0,
        yields: resourceType
      });
      this.resolveResourceGLB(this.nodes.get(id)!);
    }
    this.updateCache();
  }

  private updateCache() {
    this.cachedNodes = Array.from(this.nodes.values()).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  gatherNode(id: string): { success: boolean, item?: any, reason?: string } {
    const node = this.nodes.get(id);
    if (!node) return { success: false, reason: "Node not found." };
    if (node.amount <= 0) return { success: false, reason: "Node is depleted." };

    node.amount -= 1;
    const item = ItemRegistry.createInstance(node.yields);
    if (!item) return { success: false, reason: "Failed to gather item." };

    return { success: true, item };
  }

  tick() {
    // ⚡ Bolt Optimization: Use cached array instead of .values() iterator for better performance in the 10Hz tick loop
    for (const node of this.cachedNodes) {
      if (node.amount < node.maxAmount) {
        node.regrowTimer++;
        if (node.regrowTimer >= node.regrowRate) {
          node.amount += 1;
          node.regrowTimer = 0;
        }
      } else {
        node.regrowTimer = 0; // Reset timer if full
      }
    }
  }

  getAllNodes(): ResourceNode[] {
    // ⚡ Bolt Optimization: Return cached array instead of creating a new one every call
    return this.cachedNodes;
  }

  private resolveResourceGLB(resource: ResourceNode) {
    let glbPath = this.scatter.getGLBForResource(resource.type, resource.yields);
    if (!glbPath) glbPath = this.scatter.getGLBForResource("default", resource.type);
    resource.glbPath = glbPath;
  }
}
