export type RuntimeWarfrontSectorKind = string;

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

interface RuntimeWarfrontSystemLike {
  tick(now: number): unknown;
  getCycleSnapshot(now: number): unknown;
  getRewardTiers(): unknown;
  getFrontBossSpawnPoint(): unknown;
  getStatusForPlayer(player: any, now: number): unknown;
  registerContribution(player: any, kind: RuntimeWarfrontSectorKind, amount: number, now: number): unknown;
  claimSeasonRewards(player: any, now: number): unknown;
  markFrontBossSpawned(npcId: string, now: number): void;
  markFrontBossDefeated(now: number): void;
  markFrontBossDespawned(now: number): void;
  getFrontBossNpcId(): string | null;
  isFrontBossNpc(npcId: string): boolean;
  canSpawnFrontBoss(now: number): unknown;
  getActiveFrontBossMutator(): string | null;
  getCurrentSeasonId(now: number): string;
}

class RuntimeWarfrontStub implements RuntimeWarfrontSystemLike {
  private frontBossNpcId: string | null = null;

  tick(now: number): unknown { return { now, active: false }; }
  getCycleSnapshot(now: number): unknown { return { now, phase: 'idle', sectors: [], frontBossActive: false }; }
  getRewardTiers(): unknown { return []; }
  getFrontBossSpawnPoint(): unknown { return null; }
  getStatusForPlayer(player: any, now: number): unknown { return { playerId: player?.id ?? null, now, active: false }; }
  registerContribution(_player: any, kind: RuntimeWarfrontSectorKind, amount: number, now: number): unknown { return { kind, amount, now, accepted: false }; }
  claimSeasonRewards(_player: any, now: number): unknown { return { now, rewards: [] }; }
  markFrontBossSpawned(npcId: string, _now: number): void { this.frontBossNpcId = npcId; }
  markFrontBossDefeated(_now: number): void { this.frontBossNpcId = null; }
  markFrontBossDespawned(_now: number): void { this.frontBossNpcId = null; }
  getFrontBossNpcId(): string | null { return this.frontBossNpcId; }
  isFrontBossNpc(npcId: string): boolean { return this.frontBossNpcId === npcId; }
  canSpawnFrontBoss(now: number): unknown { return { now, canSpawn: false }; }
  getActiveFrontBossMutator(): string | null { return null; }
  getCurrentSeasonId(now: number): string { return `runtime-season-${Math.floor(now / 100000)}`; }
}

export class RuntimeWarfrontPort {
  constructor(
    private readonly system: RuntimeWarfrontSystemLike,
    private readonly tickNow: () => number,
  ) {}

  private resolveNow(now?: number): number {
    return Number.isFinite(now) ? Math.floor(Number(now)) : this.tickNow();
  }

  tick(now?: number) { return this.system.tick(this.resolveNow(now)); }
  getCycleSnapshot(now?: number) { return this.system.getCycleSnapshot(this.resolveNow(now)); }
  getRewardTiers() { return this.system.getRewardTiers(); }
  getFrontBossSpawnPoint() { return this.system.getFrontBossSpawnPoint(); }
  getStatusForPlayer(player: any, now?: number) { return this.system.getStatusForPlayer(player, this.resolveNow(now)); }
  registerContribution(player: any, kind: RuntimeWarfrontSectorKind, amount: number, now?: number) { return this.system.registerContribution(player, kind, amount, this.resolveNow(now)); }
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

export function createRuntimeWarfrontSystem(): RuntimeWarfrontSystemLike {
  return new RuntimeWarfrontStub();
}
