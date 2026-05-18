import { HeuristicWorldBrain } from './HeuristicWorldBrain.js';

export class ShatteredBordersBrain {
  private territoryInstability: number = 0;
  private isBordersShattered: boolean = false;

  constructor(private worldBrain: HeuristicWorldBrain) {}

  public evaluateBordersState(): void {
    const brain = this.worldBrain as any;
    if (!brain.getNode) return;

    const territorialIntegrityNode = brain.getNode('territorial_integrity');
    const economicVitalityNode = brain.getNode('economic_vitality');

    // Default values if nodes aren't found
    const territorialIntegrity = territorialIntegrityNode ? territorialIntegrityNode.value : 0.5;
    const economicVitality = economicVitalityNode ? economicVitalityNode.value : 0.5;

    // Trigger event when territorial integrity is low and economy is fluctuating (e.g. either very low or very high compared to integrity)
    // Here we define the condition as integrity dropping below 0.4 while vitality is > 0.6 (economic expansion breaking borders)
    // or both being extremely low < 0.3 (collapse).
    if (territorialIntegrity < 0.4 && (economicVitality > 0.6 || economicVitality < 0.3)) {
      this.isBordersShattered = true;
      // Calculate instability intensity based on the inverse of integrity
      this.territoryInstability = 1.0 - territorialIntegrity;
    } else {
      this.isBordersShattered = false;
      this.territoryInstability = 0;
    }
  }

  public getTerritoryInstability(): number {
    return this.territoryInstability;
  }

  public getIsBordersShattered(): boolean {
    return this.isBordersShattered;
  }
}
