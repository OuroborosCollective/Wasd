import { ResourceScatter } from "./ResourceScatter.js";
import { ItemRegistry } from "../inventory/ItemRegistry.js";

export interface ResourceNode {
  id: string;
  type: string; // e.g., 'tree', 'rock'
  position: { x: number, y: number };
  amount: number;
  maxAmount: number;
  regrowRate: number; // Ticks needed to regrow 1 amount
  regrowTimer: number; // Current timer for regrowth
  yields: string; // itemId it yields
}

export class ResourceSystem {
  public nodes: Map<string, ResourceNode> = new Map();
  public scatter: ResourceScatter;

  constructor() {
    this.scatter = new ResourceScatter();
  }

  initializeNodes() {
    // Generate some default nodes across the map
    const biomes = ["forest", "mountain", "desert"];
    let idCounter = 0;

    for (let i = 0; i < 50; i++) {
      const biome = biomes[Math.floor(Math.random() * biomes.length)];
      const resources = this.scatter.generateForBiome(biome);

      if (resources.length === 0) continue;

      const resourceType = resources[Math.floor(Math.random() * resources.length)];

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
          x: (Math.random() - 0.5) * 400, // spread across -200 to 200
          y: (Math.random() - 0.5) * 400
        },
        amount: maxAmount,
        maxAmount,
        regrowRate,
        regrowTimer: 0,
        yields: resourceType
      });
    }
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
    for (const node of this.nodes.values()) {
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
    return Array.from(this.nodes.values());
  }
}
