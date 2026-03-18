export class PlayerSystem {
  private players: Map<string, any> = new Map();
  // ⚡ Bolt Optimization: Cache the player list to avoid repeated Array.from() allocations in the tick loop
  private cachedPlayers: any[] = [];

  createPlayer(id: string, name: string) {
    const player = {
      id,
      name,
      role: name.toLowerCase() === "admin" ? "admin" : "player",
      position: { x: 0, y: 0, z: 0 },
      health: 100,
      stamina: 100,
      mana: 25,
      gold: 0,
      xp: 0,
      quests: [],
      skills: {},
      inventory: [],
      equipment: {
        weapon: null,
        armor: null
      },
      faction: null,
      civilization: null,
      matrixEnergy: 0,
      flags: {},
      reputation: {},
      usedChoices: []
    };
    this.players.set(id, player);
    this.updateCache();
    return player;
  }

  setPlayer(id: string, player: any) {
    this.players.set(id, player);
    this.updateCache();
  }

  getPlayer(id: string) {
    return this.players.get(id);
  }

  getAllPlayers() {
    // ⚡ Bolt Optimization: Return cached array instead of creating a new one every call
    return this.cachedPlayers;
  }

  removePlayer(id: string) {
    this.players.delete(id);
    this.updateCache();
  }

  private updateCache() {
    this.cachedPlayers = Array.from(this.players.values());
  }
}
