export class AetherStormBrain {
  public applyStormEffects(players: any[], isStorming: boolean): void {
    // Deterministic simulation of the storm's path and its effect on player movement speed
    if (!isStorming || !players) return;

    // Stable iteration over players
    const sortedPlayers = [...players].sort((a, b) => a.id.localeCompare(b.id));
    for (const player of sortedPlayers) {
      player.stats.movementSpeed = Math.floor(player.stats.movementSpeed * 0.7);
    }
  }
}
