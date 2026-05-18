import { ShatteredBordersBrain } from '../modules/brain/ShatteredBordersBrain.js';

export class ShatteredBordersWatchdog {
  private tickCounter: number = 0;

  constructor(private bordersBrain: ShatteredBordersBrain) {}

  /**
   * Runs deterministically at 10Hz in the simulation hot path.
   */
  public processTick(players: any[], mapZones: any[]): void {
    this.tickCounter++;

    // Evaluate state every 20 ticks (2 seconds)
    if (this.tickCounter % 20 === 0) {
      this.bordersBrain.evaluateBordersState();
    }

    if (this.bordersBrain.getIsBordersShattered()) {
      const instability = this.bordersBrain.getTerritoryInstability();

      // Map borders fluctuate, affecting movement penalties deterministically
      for (const player of players) {
        // Example check: if player is near a border zone (assuming spatial data)
        // We apply a movement speed penalty representing the chaotic terrain
        if (player.state === 'moving' && !player.hasBorderPenalty) {
          player.speedModifier = (player.speedModifier || 1) * (1 - (0.3 * instability));
          player.hasBorderPenalty = true;
          player.borderPenaltyIntensity = instability;
        }
      }

      // Deterministically alter zone hazard levels every 100 ticks (10 seconds)
      if (this.tickCounter % 100 === 0) {
         for (const zone of mapZones) {
             if (zone.isBorder) {
                 zone.hazardLevel = Math.floor(100 * instability);
             }
         }
      }
    } else {
      // Restore penalties
      for (const player of players) {
        if (player.hasBorderPenalty) {
          player.speedModifier = (player.speedModifier || 1) / (1 - (0.3 * player.borderPenaltyIntensity));
          player.hasBorderPenalty = false;
        }
      }
    }
  }
}
