export const WARFRONT_TICK_MS = 100;

export type WarfrontSectorKind = "combat" | "crafting" | "scouting";

export type WarfrontPhase = "building" | "boss_ready" | "boss_active" | "cooldown";

export type WarfrontSectorState = {
  id: string;
  label: string;
  kind: WarfrontSectorKind;
  routeKey: string;
  targetPoints: number;
  currentPoints: number;
  focusPosition: {
    x: number;
    y: number;
  };
};

export type WarfrontCycleState = {
  cycleId: string;
  seasonId: string;
  startedAt: number;
  endsAt: number;
  phase: WarfrontPhase;
  sectors: WarfrontSectorState[];
  frontBossNpcId: string | null;
  frontBossSpawnedAt: number;
  frontBossDefeatedAt: number;
};

export type WarfrontPersonalCycleContribution = {
  cycleId: string;
  sectors: Record<string, number>;
  totalPoints: number;
  updatedAt: number;
};

export type WarfrontRewardHistoryEntry = {
  id: string;
  seasonId: string;
  cycleId: string;
  playerId: string;
  contributionPoints: number;
  rewardItemId: string;
  createdAt: number;
};

export type WarfrontRewardTier = {
  id: string;
  pointsRequired: number;
  gold: number;
  xp: number;
};

export type PlayerWarfrontProgress = {
  seasonId: string;
  seasonPoints: number;
  lifetimeContribution: number;
  claimedTierIds: string[];
  lastCycle: {
    cycleId: string;
    sectors: Record<string, number>;
    totalPoints: number;
    updatedAt: number;
  } | null;
  rewardHistory: {
    id: string;
    seasonId: string;
    cycleId: string;
    tierId: string;
    awardedAt: number;
    gold: number;
    xp: number;
  }[];
};

export type WarfrontStatusPayload = {
  cycleId: string;
  seasonId: string;
  phase: WarfrontPhase;
  startedAt: number;
  endsAt: number;
  progressPct: number;
  sectors: {
    id: string;
    label: string;
    kind: WarfrontSectorKind;
    routeKey: string;
    targetPoints: number;
    currentPoints: number;
    progressPct: number;
    focusPosition: { x: number; y: number };
    yourPoints: number;
  }[];
  personal: {
    cyclePoints: number;
    seasonPoints: number;
    nextTier: WarfrontRewardTier | null;
    claimedTierIds: string[];
  };
  frontBoss: {
    active: boolean;
    npcId: string | null;
    mutator: string | null;
  };
};
