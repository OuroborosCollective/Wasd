import { CrimsonHarvestBrain } from '../modules/brain/CrimsonHarvestBrain.js';

export class CrimsonHarvestWatchdog {
  private tickCounter: number = 0;

  constructor(private harvestBrain: CrimsonHarvestBrain) {}

  /**
   * Expected to run deterministically at 10Hz.
   * Uses simple tick accumulation instead of wall-clock time for deterministic behaviour.
   */
  public processTick(npcs: any[], lootPool: any[]): void {
    this.tickCounter++;

    // Evaluate state only once per second (every 10 ticks)
    if (this.tickCounter % 10 === 0) {
      this.harvestBrain.evaluateHarvestState();
    }

    if (this.harvestBrain.getIsHarvestActive()) {
      const intensity = this.harvestBrain.getHarvestIntensity();

      // Deterministically apply modifiers based on intensity
      // Sorting arrays would normally be required for full determinism, assuming npcs/lootPool are sorted.

      // Scale monster health
      for (const npc of npcs) {
        if (npc.role === 'monster' && !npc.hasHarvestBuff) {
           npc.maxHealth = Math.floor(npc.maxHealth * (1 + (0.5 * intensity)));
           npc.health = npc.maxHealth;
           npc.hasHarvestBuff = true;
           npc.harvestBuffIntensity = intensity;
           // ⚡ Jules: Emissive glow will be triggered on clients through state sync
        }
      }

      // Deterministically spawn extra loot every 50 ticks (5 seconds)
      if (this.tickCounter % 50 === 0) {
        lootPool.push({
          id: `harvest-loot-${this.tickCounter}`,
          type: 'crimson_shard',
          value: Math.floor(100 * intensity),
          // Position would be deterministic based on world state
          position: { x: 0, y: 0, z: 0 }
        });
      }
    } else {
      // Remove buffs when inactive
      for (const npc of npcs) {
        if (npc.role === 'monster' && npc.hasHarvestBuff) {
           npc.maxHealth = Math.floor(npc.maxHealth / (1 + (0.5 * npc.harvestBuffIntensity)));
           npc.health = Math.min(npc.health, npc.maxHealth);
           npc.hasHarvestBuff = false;
        }
      }
    }
  }
}
