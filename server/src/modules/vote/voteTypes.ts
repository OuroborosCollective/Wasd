// @ARE-GUARD-EXEMPT: non-sim module
export type VoteVerificationMode = "api_poll" | "callback_token";

export type VoteBannerEntry = {
  internalId: string;
  providerKey: string;
  displayName: string;
  bannerImage: string;
  targetUrl: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  voteWindowHours: number;
  cooldownHours: number;
  buffHours: number;
  verificationMode: VoteVerificationMode;
  providerConfig: Record<string, unknown>;
  claimInstructions?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
};

export type VoteSessionState = "pending" | "verified" | "claimed" | "expired";

export type VoteSession = {
  id: string;
  bannerId: string;
  providerKey: string;
  playerId: string;
  createdAt: number;
  expiresAt: number;
  status: VoteSessionState;
  callbackToken: string;
  voteUrl: string;
  verifyAttempts: number;
  lastVerifyAt: number;
  verifiedAt?: number;
  claimedAt?: number;
  providerVoteId?: string;
  providerEvidence?: Record<string, unknown>;
};

export type VoteBuffBlock = {
  id: string;
  bannerId: string;
  providerKey: string;
  sessionId: string;
  startedAt: number;
  expiresAt: number;
  multiplier: number;
};

export type VoteHistoryEntry = {
  id: string;
  bannerId: string;
  providerKey: string;
  sessionId: string;
  claimedAt: number;
  verifiedAt: number;
  providerVoteId?: string;
  multiplier: number;
  durationMs: number;
};

export type VoteAuditEntry = {
  at: number;
  action: string;
  bannerId?: string;
  sessionId?: string;
  detail?: string;
};

export type PlayerVoteProgress = {
  lastClaimByBanner: Record<string, number>;
  pendingSessions: VoteSession[];
  activeBuffBlocks: VoteBuffBlock[];
  rewardHistory: VoteHistoryEntry[];
  auditLog: VoteAuditEntry[];
};

export type VoteVerifyResult = {
  verified: boolean;
  providerVoteId?: string;
  evidence?: Record<string, unknown>;
  reason?: string;
  retryAfterMs?: number;
};

