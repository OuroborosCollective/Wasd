import { HeuristicWorldBrain } from './HeuristicWorldBrain.js';

/**
 * Ecosystem Resonance Engine - Brain Component
 *
 * Calculates a global "Resonance Frequency" based on the HeuristicWorldBrain's state.
 * High resonance implies a volatile or highly magical state, while low resonance implies
 * stability and calm. This logic drives downstream effects in Watchdog and Plexity.
 */
export class ResonanceBrainLogic {
  private baseResonance: number = 0;
  private currentResonance: number = 0;
  private resonanceHistory: number[] = [];
  private readonly MAX_HISTORY = 60; // 1 minute of history at 1Hz

  constructor(private worldBrain: HeuristicWorldBrain) {}

  /**
   * Calculates the current resonance tick.
   * Expected to run periodically (e.g., 1Hz).
   */
  public calculateResonanceTick(context: any): number {
    // 1. Get base metrics from the World Brain
    const brainState = this.worldBrain.analyze(context);

    // 2. Extract specific volatility indicators
    // We access the private map indirectly by simulating how the brain calculates its values,
    // or by assuming `analyze` returns a comprehensive summary. For this feature, we will
    // use the 'centerValue' as a proxy for global volatility, combined with anomaly presence.

    let volatilityBonus = 0;
    if (brainState.activeAnomalies.length > 0) {
      volatilityBonus = brainState.activeAnomalies.length * 0.15;
    }

    // 3. Compute Resonance
    // Resonance spikes when the world is out of balance (centerValue far from 0.5)
    const imbalance = Math.abs(brainState.centerValue - 0.5) * 2; // 0.0 to 1.0

    this.currentResonance = Math.min(1.0, imbalance + volatilityBonus);

    // 4. Update History for trend analysis
    this.resonanceHistory.push(this.currentResonance);
    if (this.resonanceHistory.length > this.MAX_HISTORY) {
      this.resonanceHistory.shift();
    }

    return this.currentResonance;
  }

  public getCurrentResonance(): number {
    return this.currentResonance;
  }

  public getResonanceTrend(): 'rising' | 'falling' | 'stable' {
    if (this.resonanceHistory.length < 2) return 'stable';

    const recent = this.resonanceHistory[this.resonanceHistory.length - 1];
    const past = this.resonanceHistory[this.resonanceHistory.length - 2];

    if (recent - past > 0.05) return 'rising';
    if (past - recent > 0.05) return 'falling';
    return 'stable';
  }

  public getResonanceStateData() {
    return {
      resonance: this.currentResonance,
      trend: this.getResonanceTrend(),
      isCritical: this.currentResonance > 0.8
    };
  }
}
