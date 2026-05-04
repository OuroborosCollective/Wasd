// @ts-nocheck
import type { PlayerVoteProgress } from "./voteTypes.js";

export function ensurePlayerVoteProgress(player: any): PlayerVoteProgress {
  if (!player.voteProgress || typeof player.voteProgress !== "object") {
    player.voteProgress = {
      lastClaimByBanner: {},
      pendingSessions: [],
      activeBuffBlocks: [],
      rewardHistory: [],
      auditLog: [],
    } satisfies PlayerVoteProgress;
    return player.voteProgress;
  }
  if (
    !player.voteProgress.lastClaimByBanner ||
    typeof player.voteProgress.lastClaimByBanner !== "object"
  ) {
    player.voteProgress.lastClaimByBanner = {};
  }
  if (!Array.isArray(player.voteProgress.pendingSessions)) {
    player.voteProgress.pendingSessions = [];
  }
  if (!Array.isArray(player.voteProgress.activeBuffBlocks)) {
    player.voteProgress.activeBuffBlocks = [];
  }
  if (!Array.isArray(player.voteProgress.rewardHistory)) {
    player.voteProgress.rewardHistory = [];
  }
  if (!Array.isArray(player.voteProgress.auditLog)) {
    player.voteProgress.auditLog = [];
  }
  return player.voteProgress as PlayerVoteProgress;
}
