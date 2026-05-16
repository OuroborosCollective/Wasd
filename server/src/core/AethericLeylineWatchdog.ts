import { AethericLeylineBrain, LeylineNode } from '../modules/brain/AethericLeylineBrain.js';

/**
 * AethericLeylineWatchdog: Dynamic Resource Network
 * Monitors the 10Hz tick loop, deterministically checking player coordinates
 * against the leyline grid to apply buffs.
 */
export class AethericLeylineWatchdog {
    private brain: AethericLeylineBrain;

    constructor(brain: AethericLeylineBrain) {
        this.brain = brain;
    }

    /**
     * Called deterministically every 10Hz tick.
     */
    public checkPlayersAgainstLeylines(players: any[]) {
        const leylines = this.brain.getLeylines();

        // 10Hz Hot Path - Avoid allocations, use squared distance
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            if (!player || !player.position) continue;

            let onLeyline = false;
            let buffIntensity = 0;

            for (let j = 0; j < leylines.length; j++) {
                const node = leylines[j];
                // Using squared distance for performance in hot path (radius 5)
                const dx = player.position.x - node.x;
                const dy = player.position.y - node.y; // Assuming 2D or mapping to XZ
                const distSq = dx * dx + dy * dy;

                if (distSq < 25) { // 5^2
                    onLeyline = true;
                    buffIntensity = node.energy;
                    break;
                }
            }

            if (onLeyline) {
                this.applyLeylineBuff(player, buffIntensity);
            }
        }
    }

    private applyLeylineBuff(player: any, intensity: number) {
        // Deterministic buff application (e.g., +health regen based on intensity)
        if (player.state) {
            player.state.leylineResonance = intensity;
        }
    }
}
