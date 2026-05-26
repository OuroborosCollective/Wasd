import { PlexityGate, FeatureSet, DeviceProfile } from './PlexityGate';

export class GravimetricPlexityOptimizer {
  private gate: PlexityGate;

  constructor() {
    this.gate = PlexityGate.getInstance();
  }

  /**
   * Adapts the rendering and physics settings based on localized gravity anomalies.
   * High gravity means complex physics collisions; we must free up CPU.
   */
  public optimizeForGravityWell(gravityFactor: number): FeatureSet {
      const currentFeatures = { ...this.gate.getFeatures() };

      if (gravityFactor > 2.0) {
          console.warn(`[Plexity] Gravity anomaly detected (${gravityFactor.toFixed(2)}). Disabling IK to save CPU for physics.`);

          // Disable Inverse Kinematics entirely to give CPU back to the physics engine
          currentFeatures.enableIK = false;

          // Reduce LOD distance so fewer entities are fully simulated visually
          currentFeatures.lodDistanceModifier = Math.max(0.2, currentFeatures.lodDistanceModifier * 0.5);
      }

      if (gravityFactor > 3.5) {
          console.warn(`[Plexity] CRITICAL Gravity anomaly. Engaging extreme culling.`);
          currentFeatures.shadowRes = 0;
          currentFeatures.particleBudget = Math.min(100, currentFeatures.particleBudget);
      }

      return currentFeatures;
  }
}
