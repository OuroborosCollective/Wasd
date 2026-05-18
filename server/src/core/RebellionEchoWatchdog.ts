import { RebellionEchoBrain } from '../modules/brain/RebellionEchoBrain.js';

export class RebellionEchoWatchdog {
  private tickCounter: number = 0;

  constructor(private rebellionBrain: RebellionEchoBrain) {}

  /**
   * Runs deterministically at 10Hz in the simulation hot path.
   */
  public processTick(players: any[], guards: any[]): void {
    this.tickCounter++;

    // Evaluate state every 30 ticks (3 seconds)
    if (this.tickCounter % 30 === 0) {
      this.rebellionBrain.evaluateRebellionState();
    }

    if (this.rebellionBrain.getIsRebellionActive()) {
      const intensity = this.rebellionBrain.getRebellionIntensity();

      // Deterministically apply PvP flags and combat modifiers for players in rebellious factions
      for (const player of players) {
        if (player.faction === 'rebel' && !player.hasRebelBuff) {
           player.attackPower = Math.floor(player.attackPower * (1 + (0.2 * intensity)));
           player.pvpEnabled = true;
           player.hasRebelBuff = true;
           player.rebelBuffIntensity = intensity;
        }
      }

      // Guard NPCs enter high-alert state, increasing their detection range or stats deterministically
      for (const guard of guards) {
        if (guard.role === 'guard' && !guard.isHighAlert) {
           guard.detectionRange = Math.floor(guard.detectionRange * (1 + (0.5 * intensity)));
           guard.isHighAlert = true;
           guard.rebelBuffIntensity = intensity;
        }
      }

    } else {
      // Remove buffs when rebellion subsides
      for (const player of players) {
        if (player.faction === 'rebel' && player.hasRebelBuff) {
           player.attackPower = Math.floor(player.attackPower / (1 + (0.2 * player.rebelBuffIntensity)));
           player.pvpEnabled = false; // or revert to default based on zone
           player.hasRebelBuff = false;
        }
      }

      for (const guard of guards) {
        if (guard.role === 'guard' && guard.isHighAlert) {
           guard.detectionRange = Math.floor(guard.detectionRange / (1 + (0.5 * guard.rebelBuffIntensity)));
           guard.isHighAlert = false;
        }
      }
    }
  }
}
