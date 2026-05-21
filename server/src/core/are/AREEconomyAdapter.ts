import { EconomySimulation } from "../systems/EconomySimulation";

/**
 * AREEconomyAdapter
 * Bridges legacy EconomySimulation with ARE deterministic payload model.
 * Does NOT mutate world directly.
 */
export class AREEconomyAdapter {
  private economy: EconomySimulation;

  constructor(economy: EconomySimulation) {
    this.economy = economy;
  }

  /**
   * Execute one deterministic economy cycle
   */
  public tick(): void {
    // delegate to existing deterministic system
    this.economy.update();
  }

  /**
   * Extract ARE-style payload snapshot
   */
  public snapshotARE(): {
    l: number;
    k: number;
    r: number;
  } {
    const totalEnergy = this.economy.calculateTotalSystemEnergy();

    return {
      l: totalEnergy, // local/system energy
      k: 1000,        // kappa invariant
      r: totalEnergy % 1000 // simple relational projection
    };
  }
}
