import { HeuristicWorldBrain } from './HeuristicWorldBrain.js';

export class RebellionEchoBrain {
  private rebellionIntensity: number = 0;
  private isRebellionActive: boolean = false;

  constructor(private worldBrain: HeuristicWorldBrain) {}

  public evaluateRebellionState(): void {
    const brain = this.worldBrain as any;
    if (!brain.getNode) return;

    const socialTensionNode = brain.getNode('social_tension');
    const politicalAlignmentNode = brain.getNode('political_alignment');

    const socialTension = socialTensionNode ? socialTensionNode.value : 0.5;
    const politicalAlignment = politicalAlignmentNode ? politicalAlignmentNode.value : 0.5;

    // Trigger rebellion echo when social tension is high and political alignment (stability/agreement) is low
    if (socialTension > 0.7 && politicalAlignment < 0.4) {
      this.isRebellionActive = true;
      this.rebellionIntensity = (socialTension * 1.5 + (1.0 - politicalAlignment)) / 2.5;
    } else {
      this.isRebellionActive = false;
      this.rebellionIntensity = 0;
    }
  }

  public getRebellionIntensity(): number {
    return this.rebellionIntensity;
  }

  public getIsRebellionActive(): boolean {
    return this.isRebellionActive;
  }
}
