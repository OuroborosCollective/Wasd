import { PlexityGate, FeatureSet } from './PlexityGate';

export class SwarmPlexityOptimizer {
  private gate: PlexityGate;

  constructor() {
    this.gate = PlexityGate.getInstance();
  }

  /**
   * Adapts the rendering strategy when a high-density swarm is detected nearby.
   */
  public adaptToSwarm(swarmThreatLevel: number, distanceToSwarm: number): FeatureSet {
      const currentFeatures = { ...this.gate.getFeatures() };

      if (swarmThreatLevel < 0.3 || distanceToSwarm > 100) {
          return currentFeatures; // No severe threat or too far away
      }

      console.warn(`[Plexity Swarm] Swarm detected (Threat: ${swarmThreatLevel.toFixed(2)}, Dist: ${distanceToSwarm.toFixed(1)}). Engaging aggregate meshing.`);

      // Aggressive downgrade to keep framerate up during massive crowd events
      currentFeatures.enableIK = false;
      currentFeatures.shadowRes = Math.min(currentFeatures.shadowRes, 512);

      // Force extreme LOD to replace distant crowd with impostors early
      currentFeatures.lodDistanceModifier = 0.1;

      // Cut particles to prevent alpha overdraw death
      currentFeatures.particleBudget = Math.floor(currentFeatures.particleBudget * 0.2);

      return currentFeatures;
  }
}