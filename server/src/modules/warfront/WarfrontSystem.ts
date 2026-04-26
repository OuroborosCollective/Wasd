import { randomUUID } from "node:crypto";
import type {
  PlayerWarfrontProgress,
  WarfrontCycleState,
  WarfrontRewardTier,
  WarfrontSectorKind,
  WarfrontStatusPayload,
} from "./warfrontTypes.js";
import { ensurePlayerWarfrontProgress } from "./playerWarfrontProgress.js";

const WARFRONT_CYCLE_MS = 24 * 60 * 60 * 1000;
const WARFRONT_MUTATORS = ["storm", "ashen", "void"];
const FRONT_BOSS_SPAWN_POINT = { x: 42, y: -12 };

const REWARD_TIERS: WarfrontRewardTier[] = [
  { id: "warfront_t1", pointsRequired: 120, gold: 120, xp: 160 },
  { id: "warfront_t2", pointsRequired: 340, gold: 260, xp: 420 },
  { id: "warfront_t3", pointsRequired: 680, gold: 540, xp: 920 },
];

function clampPositiveInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function rollMutator(cycleId: string): string {
  let hash = 0;
  for (let i = 0; i < cycleId.length; i += 1) {
    hash = (hash * 31 + cycleId.charCodeAt(i)) >>> 0;
  }
  return WARFRONT_MUTATORS[hash % WARFRONT_MUTATORS.length];
}

type ContributeResult = {
  accepted: boolean;
  reason?: string;
  awarded?: {
    sectorId: string;
    amount: number;
  };
  becameBossReady: boolean;
};

export class WarfrontSystem {
  private cycle: WarfrontCycleState | null = null;
  private readonly rewardTiers = REWARD_TIERS;
  private activeBossMutator: string | null = null;
  private seasonId = "";

  constructor() {}

  ensurePlayerProgress(player: any): PlayerWarfrontProgress {
    return ensurePlayerWarfrontProgress(player);
  }

  initialize(now = Date.now()): void {
    if (this.cycle) return;
    this.cycle = this.createCycle(now);
    this.seasonId = this.cycle.seasonId;
  }

  tick(now = Date.now()): {
    rotated: boolean;
    previousCycleId?: string;
    nextCycleId?: string;
    phaseChanged?: boolean;
  } {
    this.initialize(now);
    if (!this.cycle) return { rotated: false };
    if (now >= this.cycle.endsAt) {
      const previousCycleId = this.cycle.cycleId;
      this.cycle = this.createCycle(now);
      this.seasonId = this.cycle.seasonId;
      this.activeBossMutator = null;
      return {
        rotated: true,
        previousCycleId,
        nextCycleId: this.cycle.cycleId,
      };
    }
    return { rotated: false };
  }

  getCycleSnapshot(now = Date.now()): WarfrontCycleState {
    this.initialize(now);
    return JSON.parse(JSON.stringify(this.cycle)) as WarfrontCycleState;
  }

  getCurrentSeasonId(now = Date.now()): string {
    this.initialize(now);
    return this.seasonId;
  }

  getRewardTiers(): WarfrontRewardTier[] {
    return [...this.rewardTiers];
  }

  getFrontBossSpawnPoint(): { x: number; y: number } {
    return { ...FRONT_BOSS_SPAWN_POINT };
  }

  getActiveFrontBossMutator(): string | null {
    return this.activeBossMutator;
  }

  markFrontBossSpawned(npcId: string, now = Date.now()): void {
    this.initialize(now);
    if (!this.cycle) return;
    this.cycle.phase = "boss_active";
    this.cycle.frontBossNpcId = npcId;
    this.cycle.frontBossSpawnedAt = now;
    this.activeBossMutator = rollMutator(this.cycle.cycleId);
  }

  markFrontBossDefeated(now = Date.now()): void {
    this.initialize(now);
    if (!this.cycle) return;
    this.cycle.phase = "cooldown";
    this.cycle.frontBossDefeatedAt = now;
  }

  markFrontBossDespawned(now = Date.now()): void {
    this.initialize(now);
    if (!this.cycle) return;
    this.cycle.frontBossNpcId = null;
  }

  getFrontBossNpcId(): string | null {
    return this.cycle?.frontBossNpcId ?? null;
  }

  isFrontBossNpc(npcId: string): boolean {
    const frontBossId = this.getFrontBossNpcId();
    return Boolean(frontBossId && frontBossId === npcId);
  }

  canSpawnFrontBoss(now = Date.now()): { ok: boolean; reason?: string } {
    this.initialize(now);
    if (!this.cycle) return { ok: false, reason: "Warfront cycle unavailable." };
    if (this.cycle.phase !== "boss_ready") {
      return { ok: false, reason: "Warfront not ready for front boss." };
    }
    if (this.cycle.frontBossNpcId) {
      return { ok: false, reason: "Front boss already active." };
    }
    return { ok: true };
  }

  registerContribution(
    player: any,
    kind: WarfrontSectorKind,
    rawAmount: number,
    now = Date.now(),
  ): ContributeResult {
    this.initialize(now);
    if (!this.cycle) return { accepted: false, reason: "Warfront cycle unavailable.", becameBossReady: false };
    if (this.cycle.phase === "cooldown") {
      return { accepted: false, reason: "Warfront cycle is in cooldown.", becameBossReady: false };
    }
    const amount = clampPositiveInt(rawAmount);
    if (amount <= 0) return { accepted: false, reason: "Contribution amount invalid.", becameBossReady: false };
    const sectors = this.cycle.sectors.filter((s) => s.kind === kind);
    if (sectors.length === 0) {
      return { accepted: false, reason: "No matching sector for contribution.", becameBossReady: false };
    }
    sectors.sort((a, b) => (a.currentPoints / a.targetPoints) - (b.currentPoints / b.targetPoints));
    const sector = sectors[0];
    const beforePhase = this.cycle.phase;
    sector.currentPoints = Math.min(sector.targetPoints, sector.currentPoints + amount);
    this.addPersonalContribution(player, sector.id, amount, now);
    const becameBossReady = this.tryPromotePhaseToBossReady(beforePhase);
    return {
      accepted: true,
      awarded: { sectorId: sector.id, amount },
      becameBossReady,
    };
  }

  getStatusForPlayer(player: any, now = Date.now()): WarfrontStatusPayload {
    this.initialize(now);
    const cycle = this.getCycleSnapshot(now);
    const progress = this.ensurePlayerProgress(player);
    this.syncPlayerSeason(progress, cycle.seasonId);
    const totalTarget = cycle.sectors.reduce((sum, s) => sum + s.targetPoints, 0);
    const totalCurrent = cycle.sectors.reduce((sum, s) => sum + s.currentPoints, 0);
    const cycleContribution = progress.lastCycle?.cycleId === cycle.cycleId ? progress.lastCycle.totalPoints : 0;
    const nextTier = this.rewardTiers.find((tier) => !progress.claimedTierIds.includes(tier.id))
      ?? null;
    return {
      cycleId: cycle.cycleId,
      seasonId: cycle.seasonId,
      phase: cycle.phase,
      startedAt: cycle.startedAt,
      endsAt: cycle.endsAt,
      progressPct: totalTarget > 0 ? Math.max(0, Math.min(100, Math.round((totalCurrent / totalTarget) * 100))) : 0,
      sectors: cycle.sectors.map((sector) => ({
        id: sector.id,
        label: sector.label,
        kind: sector.kind,
        routeKey: sector.routeKey,
        targetPoints: sector.targetPoints,
        currentPoints: sector.currentPoints,
        progressPct: sector.targetPoints > 0
          ? Math.max(0, Math.min(100, Math.round((sector.currentPoints / sector.targetPoints) * 100)))
          : 0,
        focusPosition: { ...sector.focusPosition },
        yourPoints:
          progress.lastCycle?.cycleId === cycle.cycleId
            ? clampPositiveInt(progress.lastCycle.sectors[sector.id] ?? 0)
            : 0,
      })),
      personal: {
        cyclePoints: cycleContribution,
        seasonPoints: clampPositiveInt(progress.seasonPoints),
        nextTier,
        claimedTierIds: [...progress.claimedTierIds],
      },
      frontBoss: {
        active: cycle.phase === "boss_active",
        npcId: cycle.frontBossNpcId,
        mutator: this.activeBossMutator,
      },
    };
  }

  claimSeasonRewards(
    player: any,
    now = Date.now(),
  ): {
    ok: boolean;
    reason?: string;
    totalGold?: number;
    totalXp?: number;
    claimedTierIds?: string[];
  } {
    const progress = this.ensurePlayerProgress(player);
    this.syncPlayerSeason(progress, this.getCurrentSeasonId(now));
    const claimable = this.rewardTiers.filter(
      (tier) => progress.seasonPoints >= tier.pointsRequired && !progress.claimedTierIds.includes(tier.id),
    );
    if (claimable.length === 0) {
      return { ok: false, reason: "No Warfront rewards ready." };
    }
    let totalGold = 0;
    let totalXp = 0;
    const claimedTierIds: string[] = [];
    for (const tier of claimable) {
      progress.claimedTierIds.push(tier.id);
      claimedTierIds.push(tier.id);
      totalGold += tier.gold;
      totalXp += tier.xp;
      progress.rewardHistory.push({
        id: `wf_reward_${randomUUID()}`,
        seasonId: progress.seasonId,
        cycleId: progress.lastCycle?.cycleId ?? "unknown",
        tierId: tier.id,
        awardedAt: now,
        gold: tier.gold,
        xp: tier.xp,
      });
    }
    player.gold = Math.max(0, Math.floor(Number(player.gold) || 0) + totalGold);
    if (progress.rewardHistory.length > 200) {
      progress.rewardHistory = progress.rewardHistory.slice(-200);
    }
    return {
      ok: true,
      totalGold,
      totalXp,
      claimedTierIds,
    };
  }

  private createCycle(now: number): WarfrontCycleState {
    const day = Math.floor(now / WARFRONT_CYCLE_MS);
    const season = `warfront_season_${Math.floor(day / 7)}`;
    return {
      cycleId: `warfront_cycle_${day}`,
      seasonId: season,
      startedAt: day * WARFRONT_CYCLE_MS,
      endsAt: (day + 1) * WARFRONT_CYCLE_MS,
      phase: "building",
      sectors: [
        {
          id: "warfront_combat",
          label: "Frontline Breach",
          kind: "combat",
          routeKey: "frontline",
          targetPoints: 320,
          currentPoints: 0,
          focusPosition: { x: 38, y: -8 },
        },
        {
          id: "warfront_crafting",
          label: "Supply Convoy",
          kind: "crafting",
          routeKey: "convoy",
          targetPoints: 220,
          currentPoints: 0,
          focusPosition: { x: 12, y: 26 },
        },
        {
          id: "warfront_scouting",
          label: "Recon Relay",
          kind: "scouting",
          routeKey: "relay",
          targetPoints: 180,
          currentPoints: 0,
          focusPosition: { x: -24, y: 18 },
        },
      ],
      frontBossNpcId: null,
      frontBossSpawnedAt: 0,
      frontBossDefeatedAt: 0,
    };
  }

  private addPersonalContribution(player: any, sectorId: string, amount: number, now: number): void {
    const progress = this.ensurePlayerProgress(player);
    const cycleId = this.cycle?.cycleId ?? "unknown_cycle";
    const seasonId = this.cycle?.seasonId ?? this.seasonId;
    this.syncPlayerSeason(progress, seasonId);
    if (!progress.lastCycle || progress.lastCycle.cycleId !== cycleId) {
      progress.lastCycle = {
        cycleId,
        sectors: {},
        totalPoints: 0,
        updatedAt: now,
      };
    }
    const currentSector = clampPositiveInt(progress.lastCycle.sectors[sectorId] ?? 0);
    progress.lastCycle.sectors[sectorId] = currentSector + amount;
    progress.lastCycle.totalPoints = clampPositiveInt(progress.lastCycle.totalPoints) + amount;
    progress.lastCycle.updatedAt = now;
    progress.seasonPoints = clampPositiveInt(progress.seasonPoints) + amount;
    progress.lifetimeContribution = clampPositiveInt(progress.lifetimeContribution) + amount;
  }

  private syncPlayerSeason(progress: PlayerWarfrontProgress, seasonId: string): void {
    if (progress.seasonId === seasonId) return;
    progress.seasonId = seasonId;
    progress.seasonPoints = 0;
    progress.claimedTierIds = [];
  }

  private tryPromotePhaseToBossReady(previousPhase: WarfrontCycleState["phase"]): boolean {
    if (!this.cycle) return false;
    const allFilled = this.cycle.sectors.every((sector) => sector.currentPoints >= sector.targetPoints);
    if (!allFilled) return false;
    if (this.cycle.phase === "boss_active" || this.cycle.phase === "cooldown") return false;
    this.cycle.phase = "boss_ready";
    return previousPhase !== "boss_ready";
  }
}
