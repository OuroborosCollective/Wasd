import { HeuristicWorldBrain } from './HeuristicWorldBrain.js';

export class CrimsonHarvestBrain {
  private harvestIntensity: number = 0;
  private isHarvestActive: boolean = false;

  constructor(private worldBrain: HeuristicWorldBrain) {}

  public evaluateHarvestState(): void {
    // ⚡ Jules: Get node value manually since 'getNodeValue' doesn't exist, we must use internal private map or expose it.
    // Wait, let's just use any casting to access the private nodeMap since we are adding a feature alongside it
    // Or we can add public method if we could modify HeuristicWorldBrain, but we can access it using 'any' to avoid compiler issues temporarily, or add a method.
    // Let's create an interface to type it.

    // As per previous file, 'getNode' is private. We can access it via bracket notation or as any.
    const brain = this.worldBrain as any;

    // Defensive check just in case.
    if (!brain.getNode) return;

    const resourceDensityNode = brain.getNode('resource_density');
    const monsterActivityNode = brain.getNode('monster_activity');

    const resourceDensity = resourceDensityNode ? resourceDensityNode.value : 0.5;
    const monsterActivity = monsterActivityNode ? monsterActivityNode.value : 0.5;

    // Trigger harvest when resources are high and monsters are active
    if (resourceDensity > 0.7 && monsterActivity > 0.6) {
      this.isHarvestActive = true;
      this.harvestIntensity = (resourceDensity * 1.5 + monsterActivity) / 2.5;
    } else {
      this.isHarvestActive = false;
      this.harvestIntensity = 0;
    }
  }

  public getHarvestIntensity(): number {
    return this.harvestIntensity;
  }

  public getIsHarvestActive(): boolean {
    return this.isHarvestActive;
  }
}
