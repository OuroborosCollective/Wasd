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

export interface RuntimeMoveIntent {
  playerId: string;
  socketId?: string;
  dx: number;
  dy: number;
  sequenceId?: number;
  acceptedAtTick: number;
}

function cleanPlayerId(id: unknown): string {
  return String(id ?? "").trim();
}

function finiteNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampUnit(value: unknown): number {
  const n = finiteNumber(value, 0);
  return Math.max(-1, Math.min(1, n));
}

function stableIntentSort(a: RuntimeMoveIntent, b: RuntimeMoveIntent): number {
  if (a.acceptedAtTick !== b.acceptedAtTick) return a.acceptedAtTick - b.acceptedAtTick;
  const playerCmp = a.playerId.localeCompare(b.playerId);
  if (playerCmp !== 0) return playerCmp;
  const socketCmp = String(a.socketId ?? "").localeCompare(String(b.socketId ?? ""));
  if (socketCmp !== 0) return socketCmp;
  return (a.sequenceId ?? 0) - (b.sequenceId ?? 0);
}

export class RuntimePlayerSystem {
  private readonly players = new Map<string, any>();
  private readonly moveIntentQueue: RuntimeMoveIntent[] = [];

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

  enqueueMoveIntent(intent: RuntimeMoveIntent): boolean {
    const playerId = cleanPlayerId(intent.playerId);
    if (!playerId || !this.players.has(playerId)) return false;

    const dx = clampUnit(intent.dx);
    const dy = clampUnit(intent.dy);
    const magSq = dx * dx + dy * dy;
    if (magSq <= 0) return false;

    const normalized = magSq > 1 ? Math.sqrt(magSq) : 1;
    this.moveIntentQueue.push({
      playerId,
      socketId: intent.socketId,
      dx: dx / normalized,
      dy: dy / normalized,
      sequenceId: Number.isSafeInteger(intent.sequenceId) ? Math.trunc(Number(intent.sequenceId)) : 0,
      acceptedAtTick: Number.isSafeInteger(intent.acceptedAtTick) && intent.acceptedAtTick >= 0 ? Math.trunc(intent.acceptedAtTick) : 0,
    });
    return true;
  }

  applyQueuedMoveIntents(tick: number, speed = 5): number {
    if (this.moveIntentQueue.length === 0) return 0;

    const currentTick = Number.isSafeInteger(tick) && tick >= 0 ? Math.trunc(tick) : 0;
    const safeSpeed = Number.isFinite(speed) && speed > 0 ? Number(speed) : 5;
    const ready = this.moveIntentQueue
      .splice(0, this.moveIntentQueue.length)
      .filter((intent) => intent.acceptedAtTick <= currentTick)
      .sort(stableIntentSort);

    for (const intent of ready) {
      const player = this.players.get(intent.playerId);
      if (!player) continue;
      player.position = player.position ?? { x: 0, y: 0, z: 0 };
      player.position.x = finiteNumber(player.position.x, 0) + intent.dx * safeSpeed;
      player.position.y = finiteNumber(player.position.y, 0) + intent.dy * safeSpeed;
      player.position.z = finiteNumber(player.position.z, 0);
      player.isOffline = false;
      player.state = "walking";
      player.lastMoveTick = currentTick;
    }

    return ready.length;
  }

  getPendingMoveIntentCount(): number {
    return this.moveIntentQueue.length;
  }

  getAllPlayers(): any[] {
    return [...this.players.values()];
  }

  getDiagnostics(): { playerCount: number; pendingMoveIntents: number; source: string } {
    return { playerCount: this.players.size, pendingMoveIntents: this.moveIntentQueue.length, source: "explicit_login_or_hydration" };
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
