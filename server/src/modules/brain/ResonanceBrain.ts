import { type ShadowGate } from '../../core/are/AREShadowGateAdapter';

export interface ResonanceDecision {
  shouldInvestigate: boolean;
  targetGateId?: string;
  expectedInsight: number; // 0 to 1
}

export class ResonanceBrain {
  /**
   * Processes available Shadow Gates and determines if an NPC should be influenced by the resonance.
   * NPCs with higher "spiritual" or "magic" affinity (simulated here) are more likely to react.
   */
  static evaluateResonance(gates: ShadowGate[], npcStats: { magicAffinity: number }): ResonanceDecision {
    if (gates.length === 0) {
      return { shouldInvestigate: false, expectedInsight: 0 };
    }

    // Find the gate with the highest intensity
    const strongestGate = gates.reduce((prev, curr) => (prev.intensity > curr.intensity ? prev : curr));

    // NPC reaction threshold is inversely proportional to their magic affinity
    const reactionThreshold = 0.9 - (npcStats.magicAffinity * 0.5);

    const shouldInvestigate = strongestGate.intensity > reactionThreshold;

    return {
      shouldInvestigate,
      targetGateId: shouldInvestigate ? strongestGate.id : undefined,
      expectedInsight: strongestGate.intensity * npcStats.magicAffinity
    };
  }
}
