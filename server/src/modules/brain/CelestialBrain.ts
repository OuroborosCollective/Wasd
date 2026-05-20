export class CelestialBrain {
  public applyCelestialEffects(players: any[], isAligned: boolean): void {
    // Deterministic logic that applies stat modifications based on the current alignment
    if (!isAligned || !players) return;

    // Use stable iteration order
    const sortedPlayers = [...players].sort((a, b) => a.id.localeCompare(b.id));
    for (const player of sortedPlayers) {
      player.stats.magicPower += 15;
    }
  }
}
