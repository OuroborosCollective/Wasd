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
  // ⚡ Bolt Optimization: Cache nodes in a Map for O(1) lookups in the hot analysis path
  private nodeMap: Map<string, BrainNode> = new Map();

  constructor() {
    for (const node of this.nodes) {
      this.nodeMap.set(node.id, node);
    }
  }

  // ⚡ Bolt Optimization: Shadow nodes array with a Map to replace O(N) array.find()
  // calls with O(1) Map.get() lookups for high-frequency node updates.
  private nodeMap: Map<string, BrainNode>;

  constructor() {
    this.nodeMap = new Map<string, BrainNode>();
    for (const node of this.nodes) {
      this.nodeMap.set(node.id, node);
    }
  }

  analyze(context: { economy: any, politics: any, world: any, npcMemory: any[] }) {
    // 1. Process World Nodes
    // Resource density based on available nodes vs total world size
    this.updateNode('resource_density', (context.world?.resourceCount || 0) / 500);
    // Monster activity increases with lower territorial integrity
    const monsterActivity = (context.world?.npcCount || 0) / 300;
    this.updateNode('monster_activity', monsterActivity);
    
    // 2. Process Interpretation Nodes
    // Economic vitality based on market activity and resource density
    const marketActivity = context.economy?.getMarketActivity ? context.economy.getMarketActivity() : 0.5;
    const economicHealth = (marketActivity + this.getNode('resource_density').value) / 2;
    this.updateNode('economic_vitality', economicHealth);
    
    // Social tension increases with monster activity and low economic vitality
    const socialTension = (monsterActivity + (1 - economicHealth)) / 2;
    this.updateNode('social_tension', socialTension);

    // 3. Process Dynamics Nodes
    // Market volatility based on social tension and economic shifts
    const volatility = (socialTension + (1 - economicHealth)) / 2;
    this.updateNode('market_volatility', volatility);
    
    // War momentum increases when social tension is high and political alignment is low
    const politicalAlignment = context.politics?.diplomacy?.length > 0 ? 0.7 : 0.3;
    this.updateNode('political_alignment', politicalAlignment);
    const warMomentum = (socialTension + (1 - politicalAlignment)) / 2;
    this.updateNode('war_momentum', warMomentum);

    // 4. Update Center
    // ⚡ Bolt Optimization: Replace double filter/reduce with a single O(N) loop to eliminate
    // intermediate array allocations and redundant iterations.
    let weightedSum = 0;
    let totalWeight = 0;
    for (const n of this.nodes) {
      if (n.category !== 'center') {
        weightedSum += n.value * n.weight;
        totalWeight += n.weight;
      }
    }

    const centerValue = totalWeight > 0 ? weightedSum / totalWeight : 0;
    this.updateNode('world_center', centerValue);

    return {
      nodes: this.nodes.length,
      summary: centerValue > 0.7 ? "State of Conflict" : centerValue < 0.3 ? "State of Stagnation" : "State of Balance",
      centerValue: centerValue,
      activeAnomalies: centerValue > 0.8 ? ["MARKET_CRASH_PROBABLE", "UNREST_LEVEL_HIGH"] : []
    };
  }

  private updateNode(id: string, value: number) {
    const node = this.nodeMap.get(id);
    if (node) {
      node.value = Math.max(0, Math.min(1, value));
    }
  }

  private getNode(id: string): BrainNode {
    return this.nodeMap.get(id)!;
  }
}
