import type { PlayerWarfrontProgress } from "./warfrontTypes.js";
import { deepClone } from "../../utils/deepClone.js";

const DEFAULT_PROGRESS: PlayerWarfrontProgress = {
  seasonId: "",
  seasonPoints: 0,
  lifetimeContribution: 0,
  claimedTierIds: [],
  lastCycle: null,
  rewardHistory: [],
};

function cloneDefault(): PlayerWarfrontProgress {
  // Bolt: Optimization - deepClone is significantly faster than JSON.parse(JSON.stringify)
  return deepClone(DEFAULT_PROGRESS);
}

export function ensurePlayerWarfrontProgress(player: any): PlayerWarfrontProgress {
  if (!player || typeof player !== "object") {
    return cloneDefault();
  }
  if (!player.warfrontProgress || typeof player.warfrontProgress !== "object") {
    player.warfrontProgress = cloneDefault();
    return player.warfrontProgress as PlayerWarfrontProgress;
  }
  const progress = player.warfrontProgress as PlayerWarfrontProgress;
  if (typeof progress.seasonId !== "string") progress.seasonId = "";
  if (!Number.isFinite(Number(progress.seasonPoints))) progress.seasonPoints = 0;
  if (!Number.isFinite(Number(progress.lifetimeContribution))) progress.lifetimeContribution = 0;
  if (!Array.isArray(progress.claimedTierIds)) progress.claimedTierIds = [];
  if (!Array.isArray(progress.rewardHistory)) progress.rewardHistory = [];
  if (progress.lastCycle && typeof progress.lastCycle === "object") {
    if (typeof progress.lastCycle.cycleId !== "string") progress.lastCycle.cycleId = "";
    if (!progress.lastCycle.sectors || typeof progress.lastCycle.sectors !== "object") {
      progress.lastCycle.sectors = {};
    }
    if (!Number.isFinite(Number(progress.lastCycle.totalPoints))) progress.lastCycle.totalPoints = 0;
    if (!Number.isFinite(Number(progress.lastCycle.updatedAt))) progress.lastCycle.updatedAt = 0;
  } else {
    progress.lastCycle = null;
  }
  return progress;
}
