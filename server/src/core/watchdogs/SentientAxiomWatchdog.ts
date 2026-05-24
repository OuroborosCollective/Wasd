export class SentientAxiomWatchdog {
  private regionalPressure: Map<string, number> = new Map();

  public monitorInteractions(regionId: string, actionIntensity: number, tick: number): void {
    // Deterministic progression of world thought pressure
    const currentPressure = this.regionalPressure.get(regionId) || 0;

    // Scale intensity using a deterministic phase shift based on tick
    const phaseShift = (tick % 1000) / 1000;
    const addedPressure = actionIntensity * (1.0 + phaseShift);

    this.regionalPressure.set(regionId, currentPressure + addedPressure);
  }

  public getPressureForRegion(regionId: string): number {
    return this.regionalPressure.get(regionId) || 0;
  }

  // Deterministic state dump sorting keys
  public dumpState(): Array<{ region: string, pressure: number }> {
    const keys = Array.from(this.regionalPressure.keys()).sort();
    return keys.map(region => ({
      region,
      pressure: this.regionalPressure.get(region)!
    }));
  }
}
