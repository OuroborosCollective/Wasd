export interface BrainNode {
  id: string;
  category: 'world' | 'interpretation' | 'dynamics' | 'center';
  value: number; // 0.0 to 1.0
  weight: number;
}

export class HeuristicWorldBrain {
  private nodes: BrainNode[] = [
    { id: 'resource_density', category: 'world', value: 0.5, weight: 1.0 },
    { id: 'climate_stability', category: 'world', value: 0.5, weight: 1.0 },
    { id: 'monster_activity', category: 'world', value: 0.5, weight: 1.0 },
    { id: 'territorial_integrity', category: 'world', value: 0.5, weight: 1.0 },
    { id: 'social_tension', category: 'interpretation', value: 0.5, weight: 1.2 },
    { id: 'economic_vitality', category: 'interpretation', value: 0.5, weight: 1.2 },
    { id: 'political_alignment', category: 'interpretation', value: 0.5, weight: 1.2 },
    { id: 'religious_fervor', category: 'interpretation', value: 0.5, weight: 1.2 },
    { id: 'war_momentum', category: 'dynamics', value: 0.0, weight: 1.5 },
    { id: 'migration_pressure', category: 'dynamics', value: 0.5, weight: 1.5 },
    { id: 'market_volatility', category: 'dynamics', value: 0.5, weight: 1.5 },
    { id: 'magic_flux', category: 'dynamics', value: 0.5, weight: 1.5 },
    { id: 'world_center', category: 'center', value: 0.5, weight: 2.0 }
  ];

  analyze(context: { economy: any, politics: any, world: any, npcMemory: any[] }) {
    this.updateNode('resource_density', context.world.resourceCount / 1000);
    this.updateNode('monster_activity', context.world.npcCount / 500);

    const economicHealth = context.economy.activeMarkets > 0 ? 0.8 : 0.2;
    this.updateNode('economic_vitality', economicHealth);

    // War momentum increases if social tension is high and alignment is low
    const tension = this.getNode('social_tension').value;
    if (tension > 0.8) {
      this.updateNode('war_momentum', this.getNode('war_momentum').value + 0.05);
    } else {
      this.updateNode('war_momentum', this.getNode('war_momentum').value - 0.02);
    }

    const weightedSum = this.nodes.filter(n => n.category !== 'center').reduce((sum, n) => sum + (n.value * n.weight), 0);
    const totalWeight = this.nodes.filter(n => n.category !== 'center').reduce((sum, n) => sum + n.weight, 0);
    const centerValue = weightedSum / totalWeight;
    this.updateNode('world_center', centerValue);

    const activeAnomalies = [];
    if (centerValue > 0.8) activeAnomalies.push("UNREST_LEVEL_HIGH");
    if (this.getNode('war_momentum').value > 0.5) activeAnomalies.push("WAR_THREAT_IMMINENT");
    if (centerValue < 0.2) activeAnomalies.push("MARKET_STAGNATION");

    return {
      nodes: this.nodes.length,
      summary: centerValue > 0.7 ? "State of Conflict" : centerValue < 0.3 ? "State of Stagnation" : "State of Balance",
      centerValue,
      activeAnomalies
    };
  }

  private updateNode(id: string, value: number) {
    const node = this.nodes.find(n => n.id === id);
    if (node) node.value = Math.max(0, Math.min(1, value));
  }

  private getNode(id: string): BrainNode { return this.nodes.find(n => n.id === id)!; }
}
