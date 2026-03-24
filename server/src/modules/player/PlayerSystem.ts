export class PlayerSystem {
  private players: Map<string, any> = new Map();

  createPlayer(id: string, name: string, charClass: string = "Novice", appearance: string = "default") {
    const player = {
      id,
      name,
      class: charClass,
      appearance,
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
      usedChoices: [],
      isOffline: false,
      state: "idle",
      stateTimer: 0,
      targetPosition: null as { x: number, y: number } | null
    };
    this.players.set(id, player);
    return player;
  }

  setPlayer(id: string, player: any) {
    this.players.set(id, player);
  }

  getPlayer(id: string) {
    return this.players.get(id);
  }

  getAllPlayers() {
    return Array.from(this.players.values());
  }

  removePlayer(id: string) {
    this.players.delete(id);
  }
}