// @ARE-GUARD-EXEMPT: core meta
const WORLD_BOSS_DUNGEON_ID = "obsidian_fracture";
const WORLD_BOSS_SCENE_ID = "worldboss_obsidian_fracture";
const HUB_SCENE_ID = "didis_hub";
const HUB_PORTAL_SPAWN_KEY = "sp_worldboss_portal";
const WORLD_BOSS_ENTRY_SPAWN_KEY = "sp_worldboss_entry";
const WORLD_BOSS_RETURN_SPAWN_KEY = "sp_player_default";
const WORLD_BOSS_NPC_ID = "npc_worldboss_frustinator";
const WORLD_BOSS_MIN_DAMAGE_PARTICIPATION = 120;
const WORLD_BOSS_MIN_HIT_PARTICIPATION = 2;
const WORLD_BOSS_RESPAWN_MS = 6 * 60_000;
const WORLD_BOSS_TOP_REWARD_LIMIT = 5;
const MEGA_IRON_FIST_ITEM_ID = "mega_iron_fist_frustinator";
const MEGA_IRON_FIST_ITEM_NAME = "Mega-Iron-Fist-Frustinator";
const WORLD_BOSS_BROADCAST_COOLDOWN_MS = 15_000;

export type WorldBossParticipant = {
  playerId: string;
  playerName: string;
  totalDamage: number;
  hits: number;
  firstHitAt: number;
  lastHitAt: number;
};

export type WorldBossRewardResult = {
  playerId: string;
  playerName: string;
  rank: number;
  damage: number;
  weaponGranted: boolean;
  unlockGranted: boolean;
  eligible: boolean;
};

export type WorldBossEncounterSummary = {
  dungeonId: string;
  encounterId: string;
  bossNpcId: string;
  defeatedAt: number;
  participants: WorldBossParticipant[];
  topRewards: WorldBossRewardResult[];
};

export type WorldBossRankingEntry = {
  playerId: string;
  playerName: string;
  damage: number;
  rank: number;
};

export type WorldBossDungeonDefinition = {
  id: string;
  public: boolean;
  sceneId: string;
  hubSceneId: string;
  hubPortalSpawnKey: string;
  entrySpawnKey: string;
  returnSpawnKey: string;
  bossNpcId: string;
  bossName: string;
  bossBaseStats: {
    health: number;
    combatLevel: number;
  };
  respawnMs: number;
};

type ActiveEncounter = {
  encounterId: string;
  dungeonId: string;
  bossNpcId: string;
  startedAt: number;
  participants: Map<string, WorldBossParticipant>;
  completed: boolean;
  announcedAt: number;
};

type BossSpawnConfig = {
  npcId: string;
  name: string;
  role: string;
  faction: string;
  position: { x: number; y: number; z: number };
  stats: {
    health: number;
    maxHealth: number;
    combatLevel: number;
    damageMultiplier: number;
    worldBoss: true;
  };
  dropTable: Array<Record<string, unknown>>;
  worldBossMeta: {
    dungeonId: string;
    tier: "worldboss";
  };
};

function ensureRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function nowMs(): number {
  return Date.now(); // ARE-DETERMINISM-ALLOW wall-clock cooldown and audit metadata, not world-hash input.
}

export class WorldBossDungeonSystem {
  private readonly definitions: Record<string, WorldBossDungeonDefinition>;
  private activeEncounter: ActiveEncounter | null = null;
  private lastBossDefeatAt = 0;
  private lastBroadcastAt = 0;
  private spawnConfig: BossSpawnConfig;
  private openDungeonInstanceId = "";
  private currentBossNpcId = WORLD_BOSS_NPC_ID;
  private encounterAnnouncementSent = false;
  private instanceSequence = 0;
  private encounterSequence = 0;

  constructor() {
    this.definitions = {
      [WORLD_BOSS_DUNGEON_ID]: {
        id: WORLD_BOSS_DUNGEON_ID,
        public: true,
        sceneId: WORLD_BOSS_SCENE_ID,
        hubSceneId: HUB_SCENE_ID,
        hubPortalSpawnKey: HUB_PORTAL_SPAWN_KEY,
        entrySpawnKey: WORLD_BOSS_ENTRY_SPAWN_KEY,
        returnSpawnKey: WORLD_BOSS_RETURN_SPAWN_KEY,
        bossNpcId: WORLD_BOSS_NPC_ID,
        bossName: "Frustinator Prime",
        bossBaseStats: {
          health: 10_500,
          combatLevel: 48,
        },
        respawnMs: WORLD_BOSS_RESPAWN_MS,
      },
    };
    this.openDungeonInstanceId = this.newInstanceId();
    this.spawnConfig = this.composeBossSpawnConfig(
      this.definitions[WORLD_BOSS_DUNGEON_ID],
      this.openDungeonInstanceId,
    );
    this.currentBossNpcId = this.spawnConfig.npcId;
  }

  getPrimaryDefinition(): WorldBossDungeonDefinition {
    return this.definitions[WORLD_BOSS_DUNGEON_ID];
  }

  ensurePlayerProgressFields(player: any): void {
    if (!player || typeof player !== "object") return;
    if (typeof player.impactBusterUnlocked !== "boolean") {
      player.impactBusterUnlocked = false;
    }
    if (!player.worldBossProgress || typeof player.worldBossProgress !== "object") {
      player.worldBossProgress = {
        firstClearAt: 0,
        totalClears: 0,
        clearedDungeonIds: [] as string[],
        rewardHistory: [] as string[],
      };
    }
    if (!Array.isArray(player.worldBossProgress.clearedDungeonIds)) {
      player.worldBossProgress.clearedDungeonIds = [];
    }
    if (!Array.isArray(player.worldBossProgress.rewardHistory)) {
      player.worldBossProgress.rewardHistory = [];
    }
    if (!Array.isArray(player.pendingRewards)) {
      player.pendingRewards = [];
    }
  }

  ensureWorldBossPortalObject(worldObjectSystem: any): void {
    if (!worldObjectSystem || typeof worldObjectSystem.getAllObjects !== "function") return;
    const objects = worldObjectSystem.getAllObjects();
    const existing = objects.find((obj: any) => obj?.id === "obj_worldboss_portal_obsidian");
    if (existing) return;
    const add = worldObjectSystem.addObject?.bind(worldObjectSystem);
    if (!add) return;
    const portal = {
      id: "obj_worldboss_portal_obsidian",
      type: "portal",
      name: "Worldboss Dungeon Portal",
      position: { x: 26, y: -6 },
      rotation: 0,
      scale: 2.8,
      glbPath: "/assets/models/props/portal_obsidian.glb",
      interaction: {
        type: "worldboss_dungeon",
        dungeonId: WORLD_BOSS_DUNGEON_ID,
      },
    };
    void add(portal);
  }

  buildSceneProfileOverrides(existingProfiles: Record<string, any>): Record<string, any> {
    const next = { ...existingProfiles };
    const hubProfile = ensureRecord(next[HUB_SCENE_ID]);
    const hubSpawnPoints = ensureRecord(hubProfile.spawnPoints);
    hubSpawnPoints[HUB_PORTAL_SPAWN_KEY] = { x: 26, y: 0, z: -6 };
    next[HUB_SCENE_ID] = {
      defaultSpawnKey: typeof hubProfile.defaultSpawnKey === "string" ? hubProfile.defaultSpawnKey : "sp_player_default",
      spawnPoints: hubSpawnPoints,
    };
    next[WORLD_BOSS_SCENE_ID] = {
      defaultSpawnKey: WORLD_BOSS_ENTRY_SPAWN_KEY,
      spawnPoints: {
        [WORLD_BOSS_ENTRY_SPAWN_KEY]: { x: 0, y: 0, z: 16 },
        sp_worldboss_arena_center: { x: 0, y: 0, z: 0 },
        sp_worldboss_boss: { x: 0, y: 0, z: -18 },
        sp_worldboss_exit: { x: 0, y: 0, z: 22 },
      },
    };
    return next;
  }

  buildTriggerOverrides(existingTriggers: any[]): any[] {
    const next = Array.isArray(existingTriggers) ? [...existingTriggers] : [];
    next.push({
      id: "tr_hub_to_worldboss_portal",
      sceneId: HUB_SCENE_ID,
      x: 26,
      y: -6,
      radius: 2.6,
      targetSceneId: WORLD_BOSS_SCENE_ID,
      targetSpawnKey: WORLD_BOSS_ENTRY_SPAWN_KEY,
      allowedSpawnKeys: ["sp_player_default", HUB_PORTAL_SPAWN_KEY],
      triggerType: "worldboss_dungeon_entry",
      dungeonId: WORLD_BOSS_DUNGEON_ID,
    });
    next.push({
      id: "tr_worldboss_exit_to_hub",
      sceneId: WORLD_BOSS_SCENE_ID,
      x: 0,
      y: 22,
      radius: 2.2,
      targetSceneId: HUB_SCENE_ID,
      targetSpawnKey: WORLD_BOSS_RETURN_SPAWN_KEY,
      triggerType: "worldboss_dungeon_exit",
      dungeonId: WORLD_BOSS_DUNGEON_ID,
    });
    return next;
  }

  maybeStartEncounterIfMissing(bossNpc: any): void {
    if (!bossNpc || (Number(bossNpc.health) || 0) <= 0) return;
    if (this.activeEncounter?.completed === false && this.activeEncounter.bossNpcId === bossNpc.id) return;
    this.activeEncounter = {
      encounterId: this.newEncounterId(),
      dungeonId: WORLD_BOSS_DUNGEON_ID,
      bossNpcId: bossNpc.id,
      startedAt: nowMs(),
      participants: new Map(),
      completed: false,
      announcedAt: 0,
    };
    this.encounterAnnouncementSent = false;
  }

  noteEncounterDamage(player: any, bossNpc: any, damage: number): void {
    if (!player || !bossNpc || !Number.isFinite(damage) || damage <= 0) return;
    this.maybeStartEncounterIfMissing(bossNpc);
    if (!this.activeEncounter || this.activeEncounter.completed) return;
    if (this.activeEncounter.bossNpcId !== bossNpc.id) return;
    const now = nowMs();
    const existing = this.activeEncounter.participants.get(player.id);
    if (existing) {
      existing.totalDamage += Math.floor(damage);
      existing.hits += 1;
      existing.lastHitAt = now;
      return;
    }
    this.activeEncounter.participants.set(player.id, {
      playerId: player.id,
      playerName: player.name || player.id,
      totalDamage: Math.floor(damage),
      hits: 1,
      firstHitAt: now,
      lastHitAt: now,
    });
  }

  buildBossSpawnConfig(): BossSpawnConfig {
    return this.spawnConfig;
  }

  shouldBroadcastEncounterPulse(): boolean {
    const now = nowMs();
    if (now - this.lastBroadcastAt < WORLD_BOSS_BROADCAST_COOLDOWN_MS) return false;
    this.lastBroadcastAt = now;
    return true;
  }

  consumeEncounterStartAnnouncement(): boolean {
    if (!this.activeEncounter || this.activeEncounter.completed) return false;
    if (this.encounterAnnouncementSent) return false;
    this.encounterAnnouncementSent = true;
    return true;
  }

  isWorldBossNpc(npc: any): boolean {
    return Boolean(
      npc &&
        typeof npc.id === "string" &&
        (npc.id === this.currentBossNpcId || npc.worldBossMeta?.dungeonId === WORLD_BOSS_DUNGEON_ID)
    );
  }

  getCurrentBossNpcId(): string {
    return this.currentBossNpcId;
  }

  getLiveRankingTop(limit = WORLD_BOSS_TOP_REWARD_LIMIT): WorldBossRankingEntry[] {
    if (!this.activeEncounter || this.activeEncounter.completed) return [];
    return [...this.activeEncounter.participants.values()]
      .filter((entry) => this.isEligibleParticipant(entry))
      .sort((a, b) => b.totalDamage - a.totalDamage || a.firstHitAt - b.firstHitAt)
      .slice(0, Math.max(1, limit))
      .map((entry, idx) => ({
        playerId: entry.playerId,
        playerName: entry.playerName,
        damage: entry.totalDamage,
        rank: idx + 1,
      }));
  }

  canEnterWorldBossDungeon(player: any): { ok: boolean; reason?: string } {
    if (!player || player.dead) return { ok: false, reason: "You cannot enter while defeated." };
    return { ok: true };
  }

  getRespawnRemainingMs(now: number): number {
    if (this.lastBossDefeatAt <= 0) return 0;
    const remain = this.lastBossDefeatAt + WORLD_BOSS_RESPAWN_MS - now;
    return Math.max(0, remain);
  }

  finalizeBossDefeat(args: {
    bossNpc: any;
    playersById: Map<string, any>;
    grantWeaponReward: (player: any) => boolean;
    grantUnlock: (player: any) => boolean;
  }): WorldBossEncounterSummary | null {
    if (!this.activeEncounter || this.activeEncounter.completed) return null;
    if (!args?.bossNpc || args.bossNpc.id !== this.activeEncounter.bossNpcId) return null;

    this.activeEncounter.completed = true;
    this.lastBossDefeatAt = nowMs();
    const ranked = [...this.activeEncounter.participants.values()]
      .filter((entry) => this.isEligibleParticipant(entry))
      .sort((a, b) => b.totalDamage - a.totalDamage || a.firstHitAt - b.firstHitAt);
    const top = ranked.slice(0, WORLD_BOSS_TOP_REWARD_LIMIT);
    const results: WorldBossRewardResult[] = [];

    let rank = 0;
    for (const entry of ranked) {
      rank += 1;
      const player = args.playersById.get(entry.playerId);
      if (!player) continue;
      this.ensurePlayerProgressFields(player);
      let weaponGranted = false;
      if (rank <= WORLD_BOSS_TOP_REWARD_LIMIT) {
        weaponGranted = args.grantWeaponReward(player);
      }
      const unlockGranted = args.grantUnlock(player);
      results.push({
        playerId: entry.playerId,
        playerName: entry.playerName,
        rank,
        damage: entry.totalDamage,
        weaponGranted,
        unlockGranted,
        eligible: top.some((x) => x.playerId === entry.playerId),
      });
      this.noteCompletionInProgress(player);
    }

    return {
      dungeonId: this.activeEncounter.dungeonId,
      encounterId: this.activeEncounter.encounterId,
      bossNpcId: this.activeEncounter.bossNpcId,
      defeatedAt: this.lastBossDefeatAt,
      participants: ranked,
      topRewards: results.filter((r) => r.rank <= WORLD_BOSS_TOP_REWARD_LIMIT),
    };
  }

  prepareNextBossInstance(): BossSpawnConfig {
    const instanceId = this.newInstanceId();
    this.spawnConfig = this.composeBossSpawnConfig(
      this.getPrimaryDefinition(),
      instanceId,
    );
    this.currentBossNpcId = this.spawnConfig.npcId;
    this.openDungeonInstanceId = instanceId;
    this.activeEncounter = null;
    this.encounterAnnouncementSent = false;
    return this.spawnConfig;
  }

  private isEligibleParticipant(entry: WorldBossParticipant): boolean {
    return entry.totalDamage >= WORLD_BOSS_MIN_DAMAGE_PARTICIPATION && entry.hits >= WORLD_BOSS_MIN_HIT_PARTICIPATION;
  }

  private noteCompletionInProgress(player: any): void {
    const progress = ensureRecord(player.worldBossProgress);
    const cleared = Array.isArray(progress.clearedDungeonIds) ? progress.clearedDungeonIds : [];
    if (!cleared.includes(WORLD_BOSS_DUNGEON_ID)) {
      cleared.push(WORLD_BOSS_DUNGEON_ID);
      progress.clearedDungeonIds = cleared;
    }
    const totalClears = Number(progress.totalClears) || 0;
    progress.totalClears = totalClears + 1;
    if (!Number(progress.firstClearAt)) {
      progress.firstClearAt = nowMs();
    }
    player.worldBossProgress = progress;
  }

  private composeBossSpawnConfig(
    def: WorldBossDungeonDefinition,
    instanceId: string,
  ): BossSpawnConfig {
    const npcId = `${def.bossNpcId}_${instanceId}`;
    return {
      npcId,
      name: def.bossName,
      role: "Worldboss",
      faction: "Hostile",
      position: { x: 0, y: -18, z: 0 },
      stats: {
        health: def.bossBaseStats.health,
        maxHealth: def.bossBaseStats.health,
        combatLevel: def.bossBaseStats.combatLevel,
        damageMultiplier: 3.5,
        worldBoss: true,
      },
      dropTable: [
        { itemId: "relic_fragment", chance: 1.0 },
        { itemId: "forgotten_sigil", chance: 0.45 },
      ],
      worldBossMeta: {
        dungeonId: def.id,
        tier: "worldboss",
      },
    };
  }

  private newInstanceId(): string {
    this.instanceSequence += 1;
    return `wb_${this.instanceSequence.toString(36).padStart(4, "0")}`;
  }

  private newEncounterId(): string {
    this.encounterSequence += 1;
    return `wbe_${this.encounterSequence.toString(36).padStart(4, "0")}`;
  }
}

export {
  MEGA_IRON_FIST_ITEM_ID,
  MEGA_IRON_FIST_ITEM_NAME,
  WORLD_BOSS_BROADCAST_COOLDOWN_MS,
  WORLD_BOSS_DUNGEON_ID,
  WORLD_BOSS_ENTRY_SPAWN_KEY,
  WORLD_BOSS_NPC_ID,
  WORLD_BOSS_RETURN_SPAWN_KEY,
  WORLD_BOSS_SCENE_ID,
  WORLD_BOSS_TOP_REWARD_LIMIT,
};
