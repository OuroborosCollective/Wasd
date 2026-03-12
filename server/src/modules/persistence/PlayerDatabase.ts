export class PlayerDatabase {
  private players = new Map<string, any>();

  savePlayer(player: any) {
    this.players.set(player.id, player);
  }

  loadPlayer(id: string) {
    return this.players.get(id) ?? null;
  }
}