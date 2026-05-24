export class CausalityFractureWatchdog {
  private energyGrid: Map<string, number> = new Map();

  public registerEnergySpike(gridId: string, energy: number, tick: number): void {
    const currentEnergy = this.energyGrid.get(gridId) || 0;

    // Deterministic decay modifier
    const decay = (tick % 100) / 1000;
    const finalEnergy = currentEnergy * (1.0 - decay) + energy;

    this.energyGrid.set(gridId, finalEnergy);
  }

  public getFractureThresholds(): Array<{ gridId: string, intensity: number }> {
    const keys = Array.from(this.energyGrid.keys()).sort();
    return keys.map(gridId => ({
      gridId,
      intensity: this.energyGrid.get(gridId)!
    }));
  }
}
