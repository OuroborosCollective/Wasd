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
      level: 1,
      health: 100,
      maxHealth: 100,
      dead: false,
      deathAt: 0,
      totalDeaths: 0,
      stamina: 100,
      maxStamina: 100,
      mana: 25,
      maxMana: 25,
      gold: 0,
      xp: 0,
      quests: [],
      skills: { combat: { level: 1 } },
      inventory: [],
      gearInventory: [] as unknown[],
      lootPity: { killsSinceLegendary: 0, killsSinceSet: 0 },
      lootFilter: {
        showRarities: ["magic", "rare", "legendary", "set"],
        autoPickupStackIds: [] as string[],
      },
      equipment: {
        weapon: null,
        armor: null,
        offHand: null,
      },
      faction: null,
      civilization: null,
      matrixEnergy: 0,
      flags: {},
      reputation: {},
      attributes: { str: 10, dex: 10, sta: 10, int: 10, availablePoints: 5 },
      usedChoices: [],
      isOffline: false,
      state: "idle",
      stateTimer: 0,
      targetPosition: null as { x: number, y: number } | null,
      /** Client-selected NPC id for attacks (optional) */
      combatTargetNpcId: null as string | null,
      /** skillId -> cooldown end timestamp (ms) */
      skillCooldowns: {} as Record<string, number>,
      /** Unlockable gameplay skill progression */
      impactBusterUnlocked: false,
      /** Worldboss progression + anti-duplicate reward history */
      worldBossProgress: {
        firstClearAt: 0,
        totalClears: 0,
        clearedDungeonIds: [] as string[],
        rewardHistory: [] as string[],
      },
      /** Server-side safe fallback queue for rewards when direct grant fails */
      pendingRewards: [] as unknown[],
      /** Toplist voting history/sessions/buff stacking state (server-authoritative). */
      voteProgress: {
        lastClaimByBanner: {} as Record<string, number>,
        pendingSessions: [] as unknown[],
        activeBuffBlocks: [] as unknown[],
        rewardHistory: [] as unknown[],
        auditLog: [] as unknown[],
      },
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

  getPlayersMap(): Map<string, any> {
    return this.players;
  }

  getAllPlayers() {
    return Array.from(this.players.values());
  }

  removePlayer(id: string) {
    this.players.delete(id);
  }
}