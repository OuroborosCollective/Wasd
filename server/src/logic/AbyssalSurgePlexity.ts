export class AbyssalSurgePlexity {
  /**
   * Inverts gravitational constraints based on dark matter density.
   */
  public invertEntityGravity(baseWeight: number, darkMatterDensity: number): number {
    /* ARE-DETERMINISM-ALLOW */
    // Heavy entities become lighter, light entities become heavier
    if (darkMatterDensity > 0.6) {
      if (baseWeight > 100) return baseWeight * 0.2;
      return baseWeight * 3.0;
    }
    return baseWeight;
  }
}
