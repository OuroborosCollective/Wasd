export interface ShadowGateData {
  id: string;
  centerEntityId: string;
  intensity: number;
  omega: number;
  tick: number;
}

export interface ResonanceDecisionData {
  shouldInvestigate: boolean;
  targetGateId?: string;
  expectedInsight: number;
}

/**
 * The ShadowResonanceBridge orchestrates the flow of ARE topology resonance
 * into NPC cognitive decisions and eventually into their persistent memory.
 */
export class ShadowResonanceBridge {
  /**
   * Processes the full cycle of resonance detection to memory persistence.
   */
  static async orchestrate(
    tick: number,
    detectGates: (tick: number) => ShadowGateData[],
    evaluateBrain: (gates: ShadowGateData[]) => ResonanceDecisionData,
    recordMemory: (gateId: string, intensity: number, insight: number) => Promise<void>
  ): Promise<void> {
    // 1. Detect Gates from ARE Topology
    const gates = detectGates(tick);
    if (gates.length === 0) return;

    // 2. Evaluate with Brain logic
    const decision = evaluateBrain(gates);

    // 3. Persist to NPC Memory if the resonance was significant enough
    if (decision.shouldInvestigate && decision.targetGateId) {
      const targetGate = gates.find(g => g.id === decision.targetGateId);
      if (targetGate) {
        await recordMemory(targetGate.id, targetGate.intensity, decision.expectedInsight);
      }
    }
  }
}
