import { WarfrontSystem } from "../../modules/warfront/WarfrontSystem.js";
import type { WarfrontSectorKind } from "../../modules/warfront/warfrontTypes.js";

export type RuntimeWarfrontSectorKind = WarfrontSectorKind;

export class RuntimePlayerSystem {
  private readonly players = new Map<string, any>();

  getPlayer(id: string): any | null {
    const playerId = id.trim();
    if (!playerId) return null;
    let player = this.players.get(playerId);
    if (!player) {
      player = { id: playerId, gold: 0 };
      this.players.set(playerId, player);
    }
    return player;
  }

  getAllPlayers(): any[] {
    return [...this.players.values()];
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
