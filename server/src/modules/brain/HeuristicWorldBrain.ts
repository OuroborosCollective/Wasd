export interface BrainNode {
  id: string;
  category: 'world' | 'interpretation' | 'dynamics' | 'center';
  value: number; // 0.0 to 1.0
  weight: number;
}

export class HeuristicWorldBrain {
  private nodes: BrainNode[] = [
    // World Nodes (4)
    { id: 'resource_density', category: 'world', value: 0.5, weight: 1.0 },
    { id: 'climate_stability', category: 'world', value: 0.5, weight: 1.0 },
    { id: 'monster_activity', category: 'world', value: 0.5, weight: 1.0 },
    { id: 'territorial_integrity', category: 'world', value: 0.5, weight: 1.0 },

    // Interpretation Nodes (4)
    { id: 'social_tension', category: 'interpretation', value: 0.5, weight: 1.2 },
    { id: 'economic_vitality', category: 'interpretation', value: 0.5, weight: 1.2 },
    { id: 'political_alignment', category: 'interpretation', value: 0.5, weight: 1.2 },
    { id: 'religious_fervor', category: 'interpretation', value: 0.5, weight: 1.2 },

    // Dynamics Nodes (4)
    { id: 'war_momentum', category: 'dynamics', value: 0.5, weight: 1.5 },
    { id: 'migration_pressure', category: 'dynamics', value: 0.5, weight: 1.5 },
    { id: 'market_volatility', category: 'dynamics', value: 0.5, weight: 1.5 },
    { id: 'magic_flux', category: 'dynamics', value: 0.5, weight: 1.5 },

    // Center Node (1)
    { id: 'world_center', category: 'center', value: 0.5, weight: 2.0 }
  ];

  analyze(context: { economy: any, politics: any, world: any, npcMemory: any[] }) {
    // 1. Process World Nodes
    this.updateNode('resource_density', (context.world?.resourceCount || 0) / 1000);
    this.updateNode('monster_activity', (context.world?.npcCount || 0) / 500);

    // 2. Process Interpretation Nodes
    const economicHealth = (context.economy?.activeMarkets || 0) > 0 ? 0.8 : 0.2;
    this.updateNode('economic_vitality', economicHealth);

    // 3. Process Dynamics Nodes
    const volatility = (this.getNode('social_tension').value + (1 - economicHealth)) / 2;
    this.updateNode('market_volatility', volatility);

    // 4. Update Center
    let weightedSum = 0;
    let totalWeight = 0;

    // ⚡ Bolt Optimization: Use a single for-loop instead of multiple array allocations
    // from .filter() and .reduce() in a potentially hot path
    for (const n of this.nodes) {
      if (n.category !== 'center') {
        weightedSum += n.value * n.weight;
        totalWeight += n.weight;
      }
    }

    const centerValue = weightedSum / totalWeight;
    this.updateNode('world_center', centerValue);

    return {
      nodes: this.nodes.length,
      summary: centerValue > 0.7 ? "State of Conflict" : centerValue < 0.3 ? "State of Stagnation" : "State of Balance",
      centerValue: centerValue,
      activeAnomalies: centerValue > 0.8 ? ["MARKET_CRASH_PROBABLE", "UNREST_LEVEL_HIGH"] : []
    };
  }

  // ⚡ Bolt Optimization: Cache nodes by ID for O(1) lookups instead of O(N) array finds
  private nodeCache: Map<string, BrainNode> | null = null;

  private updateNode(id: string, value: number) {
    const node = this.getNode(id);
    if (node) {
      node.value = Math.max(0, Math.min(1, value));
    }
  }

  private getNode(id: string): BrainNode {
    if (!this.nodeCache) {
      this.nodeCache = new Map();
      for (const n of this.nodes) {
        this.nodeCache.set(n.id, n);
      }
    }
    return this.nodeCache.get(id)!;
  }
}
