export class VoidResonanceBrain {
  public processVoidCorruption(players: any[], isResonating: boolean): void {
    // Deterministic logic tracking the corruption level and computing periodic damage
    if (!isResonating || !players) return;

    // Sort keys for deterministic map iteration
    const sortedPlayers = [...players].sort((a, b) => a.id.localeCompare(b.id));
    for (const player of sortedPlayers) {
      player.health = Math.max(0, player.health - 5);
      player.corruption = Math.min(100, player.corruption + 10);
    }
  }
}
