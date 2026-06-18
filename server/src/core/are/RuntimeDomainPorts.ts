import { WarfrontSystem } from "../../modules/warfront/WarfrontSystem.js";
import type { WarfrontSectorKind } from "../../modules/warfront/warfrontTypes.js";

export type RuntimeWarfrontSectorKind = WarfrontSectorKind;

export type RuntimePlayerSource = "login" | "client-2d" | "test" | "system";

export interface RuntimePlayerSeed {
  id: string;
  name?: string;
  role?: string;
  source?: RuntimePlayerSource | string;
  position?: { x?: number; y?: number; z?: number };
  tick?: number;
}

function cleanPlayerId(id: unknown): string {
  return String(id ?? "").trim();
}

function finiteNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export class RuntimePlayerSystem {
  private readonly players = new Map<string, any>();

  /**
   * Read-only lookup. This must never create state: callers that need a new
   * player must prove login/presence causality through createPlayer or
   * getOrCreatePlayerFromLogin.
   */
  getPlayer(id: string): any | null {
    const playerId = cleanPlayerId(id);
    if (!playerId) return null;
    return this.players.get(playerId) ?? null;
  }

  createPlayer(id: string, name = "Architect", role = "Explorer", source: RuntimePlayerSource | string = "login"): any {
    return this.getOrCreatePlayerFromLogin({ id, name, role, source });
  }

  getOrCreatePlayerFromLogin(seed: RuntimePlayerSeed): any {
    const playerId = cleanPlayerId(seed.id);
    if (!playerId) return null;

    let player = this.players.get(playerId);
    if (!player) {
      const position = seed.position ?? {};
      player = {
        id: playerId,
        name: String(seed.name ?? "Architect"),
        class: String(seed.role ?? "Explorer"),
        role: String(seed.role ?? "Explorer"),
        source: String(seed.source ?? "login"),
        createdAtTick: Number.isSafeInteger(seed.tick) ? seed.tick : 0,
        gold: 0,
        xp: 0,
        level: 1,
        health: 100,
        maxHealth: 100,
        mana: 25,
        maxMana: 25,
        inventory: [],
        equipment: {},
        quests: [],
        position: {
          x: finiteNumber(position.x, 0),
          y: finiteNumber(position.y, 0),
          z: finiteNumber(position.z, 0),
        },
        state: "idle",
        isOffline: false,
      };
      this.players.set(playerId, player);
    }

    return player;
  }

  upsertHydratedPlayer(player: any): any | null {
    const playerId = cleanPlayerId(player?.id);
    if (!playerId) return null;
    const current = this.players.get(playerId);
    const hydrated = current ? Object.assign(current, player, { id: playerId }) : { ...player, id: playerId };
    this.players.set(playerId, hydrated);
    return hydrated;
  }

  getAllPlayers(): any[] {
    return [...this.players.values()];
  }

  getDiagnostics(): { playerCount: number; source: string } {
    return { playerCount: this.players.size, source: "explicit_login_or_hydration" };
  }
}

export class RuntimeWarfrontPort {
  constructor(
    private readonly system: WarfrontSystem,
    private readonly tickNow: () => number,
  ) {}

  private resolveNow(now?: number): number {
    return Number.isFinite(now) ? Math.floor(Number(now)) : this.tickNow();
  }

  initialize(now?: number): void { this.system.initialize(this.resolveNow(now)); }
  tick(now?: number) { return this.system.tick(this.resolveNow(now)); }
  getCycleSnapshot(now?: number) { return this.system.getCycleSnapshot(this.resolveNow(now)); }
  getRewardTiers() { return this.system.getRewardTiers(); }
  getFrontBossSpawnPoint() { return this.system.getFrontBossSpawnPoint(); }
  getStatusForPlayer(player: any, now?: number) { return this.system.getStatusForPlayer(player, this.resolveNow(now)); }
  registerContribution(player: any, kind: RuntimeWarfrontSectorKind, amount: number, now?: number) {
    return this.system.registerContribution(player, kind, amount, this.resolveNow(now));
  }
  claimSeasonRewards(player: any, now?: number) { return this.system.claimSeasonRewards(player, this.resolveNow(now)); }
  markFrontBossSpawned(npcId: string, now?: number): void { this.system.markFrontBossSpawned(npcId, this.resolveNow(now)); }
  markFrontBossDefeated(now?: number): void { this.system.markFrontBossDefeated(this.resolveNow(now)); }
  markFrontBossDespawned(now?: number): void { this.system.markFrontBossDespawned(this.resolveNow(now)); }
  getFrontBossNpcId(): string | null { return this.system.getFrontBossNpcId(); }
  isFrontBossNpc(npcId: string): boolean { return this.system.isFrontBossNpc(npcId); }
  canSpawnFrontBoss(now?: number) { return this.system.canSpawnFrontBoss(this.resolveNow(now)); }
  getActiveFrontBossMutator(): string | null { return this.system.getActiveFrontBossMutator(); }
  getCurrentSeasonId(now?: number): string { return this.system.getCurrentSeasonId(this.resolveNow(now)); }
}

export function createRuntimeWarfrontSystem(): WarfrontSystem {
  return new WarfrontSystem();
}
