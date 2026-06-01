import { randomUUID } from "node:crypto";
import { VoteBannerStore } from "./VoteBannerStore.js";
import { VoteProviderRegistry } from "./VoteProviderRegistry.js";
import type {
  PlayerVoteProgress,
  VoteAuditEntry,
  VoteBannerEntry,
  VoteBuffBlock,
  VoteHistoryEntry,
  VoteSession,
} from "./voteTypes.js";
import { ensurePlayerVoteProgress } from "./playerVoteProgress.js";

type VoteStatusBannerRow = {
  internalId: string;
  providerKey: string;
  displayName: string;
  bannerImage: string;
  targetUrl: string;
  description?: string;
  sortOrder: number;
  buffHours: number;
  cooldownHours: number;
  voteWindowHours: number;
  claimInstructions?: string;
  status: "ready" | "cooldown" | "pending" | "claimable";
  cooldownRemainingMs: number;
  nextEligibleAt: number;
  session?: {
    id: string;
    status: VoteSession["status"];
    expiresAt: number;
    verifiedAt?: number;
    voteUrl: string;
  };
};

type VoteBuffState = {
  activeMultiplier: number;
  totalRemainingMs: number;
  blocks: Array<{
    id: string;
    bannerId: string;
    providerKey: string;
    expiresAt: number;
    remainingMs: number;
  }>;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asFiniteNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toMs(hours: number): number {
  return Math.max(1, hours) * 60 * 60 * 1000;
}

export class VoteSystem {
  constructor(
    private readonly bannerStore = new VoteBannerStore(),
    private readonly providers = new VoteProviderRegistry(),
  ) {}

  ensurePlayerVoteProgress(player: any): PlayerVoteProgress {
    const progress = ensurePlayerVoteProgress(player);
    this.pruneState(player, 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */);
    return progress;
  }

  listAdminBanners(): VoteBannerEntry[] {
    return this.bannerStore.listAll();
  }

  listActiveBannersPublic(): Array<{
    internalId: string;
    providerKey: string;
    displayName: string;
    bannerImage: string;
    targetUrl: string;
    description?: string;
    sortOrder: number;
    buffHours: number;
    cooldownHours: number;
    voteWindowHours: number;
    verificationMode: VoteBannerEntry["verificationMode"];
    claimInstructions?: string;
  }> {
    return this.bannerStore.listActive().map((row) => ({
      internalId: row.internalId,
      providerKey: row.providerKey,
      displayName: row.displayName,
      bannerImage: row.bannerImage,
      targetUrl: row.targetUrl,
      description: row.description,
      sortOrder: row.sortOrder,
      buffHours: row.buffHours,
      cooldownHours: row.cooldownHours,
      voteWindowHours: row.voteWindowHours,
      verificationMode: row.verificationMode,
      claimInstructions: row.claimInstructions,
    }));
  }

  upsertBanner(input: Partial<VoteBannerEntry> & {
    internalId?: string;
    providerKey: string;
    displayName: string;
    bannerImage: string;
    targetUrl: string;
  }): VoteBannerEntry {
    return this.bannerStore.upsert(input);
  }

  deleteBanner(internalId: string): boolean {
    return this.bannerStore.delete(internalId);
  }

  setBannerOrder(idsInOrder: string[]): VoteBannerEntry[] {
    return this.bannerStore.setOrder(idsInOrder);
  }

  getPlayerVoteStatus(player: any): {
    buff: VoteBuffState;
    banners: VoteStatusBannerRow[];
  } {
    const now = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
    const progress = this.ensurePlayerVoteProgress(player);
    const buff = this.getBuffState(player, now);
    const activeByBanner = new Map<string, VoteSession>();
    for (const session of progress.pendingSessions) {
      if (session.status === "claimed" || session.status === "expired") continue;
      const existing = activeByBanner.get(session.bannerId);
      if (!existing || session.createdAt > existing.createdAt) {
        activeByBanner.set(session.bannerId, session);
      }
    }
    const banners = this.bannerStore.listActive().map((banner) => {
      const cooldownMs = toMs(banner.cooldownHours);
      const lastClaimAt = asFiniteNumber(progress.lastClaimByBanner[banner.internalId], 0);
      const nextEligibleAt = lastClaimAt > 0 ? lastClaimAt + cooldownMs : 0;
      const cooldownRemainingMs = nextEligibleAt > now ? nextEligibleAt - now : 0;
      const session = activeByBanner.get(banner.internalId);
      const status: VoteStatusBannerRow["status"] =
        session?.status === "verified"
          ? "claimable"
          : session
            ? "pending"
            : cooldownRemainingMs > 0
              ? "cooldown"
              : "ready";
      return {
        internalId: banner.internalId,
        providerKey: banner.providerKey,
        displayName: banner.displayName,
        bannerImage: banner.bannerImage,
        targetUrl: banner.targetUrl,
        description: banner.description,
        sortOrder: banner.sortOrder,
        buffHours: banner.buffHours,
        cooldownHours: banner.cooldownHours,
        voteWindowHours: banner.voteWindowHours,
        claimInstructions: banner.claimInstructions,
        status,
        cooldownRemainingMs,
        nextEligibleAt,
        session: session
          ? {
              id: session.id,
              status: session.status,
              expiresAt: session.expiresAt,
              verifiedAt: session.verifiedAt,
              voteUrl: session.voteUrl,
            }
          : undefined,
      } satisfies VoteStatusBannerRow;
    });
    return { buff, banners };
  }

  createVoteSession(
    player: any,
    bannerId: string,
    callbackBaseUrl: string,
  ): {
    ok: boolean;
    reason?: string;
    session?: VoteSession;
    status?: ReturnType<VoteSystem["getPlayerVoteStatus"]>;
  } {
    const now = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
    const progress = this.ensurePlayerVoteProgress(player);
    const normalizedBannerId = asNonEmptyString(bannerId);
    if (!normalizedBannerId) {
      return { ok: false, reason: "Vote banner id is required." };
    }
    const banner = this.bannerStore.getById(normalizedBannerId);
    if (!banner || !banner.isActive) {
      return { ok: false, reason: "Vote banner is unavailable." };
    }

    const lastClaimAt = asFiniteNumber(progress.lastClaimByBanner[banner.internalId], 0);
    const cooldownMs = toMs(banner.cooldownHours);
    if (lastClaimAt > 0 && now < lastClaimAt + cooldownMs) {
      return { ok: false, reason: "Vote banner is on daily cooldown." };
    }

    const existing = progress.pendingSessions.find(
      (s) =>
        s.bannerId === banner.internalId &&
        s.status !== "claimed" &&
        s.status !== "expired" &&
        s.expiresAt > now,
    );
    if (existing) {
      return { ok: true, session: existing, status: this.getPlayerVoteStatus(player) };
    }

    const id = `vote_${randomUUID()}`;
    const session: VoteSession = {
      id,
      bannerId: banner.internalId,
      providerKey: banner.providerKey,
      playerId: player.id,
      createdAt: now,
      expiresAt: now + toMs(banner.voteWindowHours),
      status: "pending",
      callbackToken: randomUUID().replace(/-/g, ""),
      voteUrl: banner.targetUrl,
      verifyAttempts: 0,
      lastVerifyAt: 0,
    };
    const provider = this.providers.resolve(banner.verificationMode);
    session.voteUrl = provider.buildVoteUrl({
      banner,
      session,
      callbackBaseUrl,
    });
    progress.pendingSessions.push(session);
    this.appendAudit(progress.auditLog, {
      at: now,
      action: "session_created",
      bannerId: banner.internalId,
      sessionId: session.id,
    });
    return { ok: true, session, status: this.getPlayerVoteStatus(player) };
  }

  async verifySession(
    player: any,
    sessionId: string,
  ): Promise<{
    ok: boolean;
    verified: boolean;
    reason?: string;
    retryAfterMs?: number;
    status: ReturnType<VoteSystem["getPlayerVoteStatus"]>;
  }> {
    const now = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
    const normalizedSessionId = asNonEmptyString(sessionId);
    if (!normalizedSessionId) {
      return {
        ok: false,
        verified: false,
        reason: "Vote session id is required.",
        status: this.getPlayerVoteStatus(player),
      };
    }
    const progress = this.ensurePlayerVoteProgress(player);
    const session = progress.pendingSessions.find((s) => s.id === normalizedSessionId);
    if (!session) {
      return {
        ok: false,
        verified: false,
        reason: "Vote session not found.",
        status: this.getPlayerVoteStatus(player),
      };
    }
    if (session.playerId !== player.id) {
      return {
        ok: false,
        verified: false,
        reason: "Vote session belongs to another player.",
        status: this.getPlayerVoteStatus(player),
      };
    }
    if (session.status === "claimed") {
      return {
        ok: false,
        verified: true,
        reason: "Vote session already claimed.",
        status: this.getPlayerVoteStatus(player),
      };
    }
    if (session.expiresAt <= now) {
      session.status = "expired";
      return {
        ok: false,
        verified: false,
        reason: "Vote session expired.",
        status: this.getPlayerVoteStatus(player),
      };
    }
    if (session.status === "verified") {
      return { ok: true, verified: true, status: this.getPlayerVoteStatus(player) };
    }
    if (now - session.lastVerifyAt < 1500) {
      return {
        ok: false,
        verified: false,
        reason: "Verify cooldown active.",
        retryAfterMs: 1500 - (now - session.lastVerifyAt),
        status: this.getPlayerVoteStatus(player),
      };
    }

    const banner = this.bannerStore.getById(session.bannerId);
    if (!banner) {
      session.status = "expired";
      return {
        ok: false,
        verified: false,
        reason: "Vote banner no longer exists.",
        status: this.getPlayerVoteStatus(player),
      };
    }

    session.verifyAttempts += 1;
    session.lastVerifyAt = now;
    const provider = this.providers.resolve(banner.verificationMode);
    const verify = await provider.verifyVote({ banner, session });
    if (!verify.verified) {
      this.appendAudit(progress.auditLog, {
        at: now,
        action: "verify_failed",
        bannerId: banner.internalId,
        sessionId: session.id,
        detail: verify.reason,
      });
      return {
        ok: false,
        verified: false,
        reason: verify.reason ?? "Vote not yet verified.",
        retryAfterMs: verify.retryAfterMs,
        status: this.getPlayerVoteStatus(player),
      };
    }

    session.status = "verified";
    session.verifiedAt = now;
    session.providerVoteId = verify.providerVoteId ?? session.providerVoteId;
    session.providerEvidence = {
      ...(session.providerEvidence ?? {}),
      ...(verify.evidence ?? {}),
    };
    this.appendAudit(progress.auditLog, {
      at: now,
      action: "verify_ok",
      bannerId: banner.internalId,
      sessionId: session.id,
      detail: session.providerVoteId ? `voteId:${session.providerVoteId}` : undefined,
    });
    return { ok: true, verified: true, status: this.getPlayerVoteStatus(player) };
  }

  claimSession(
    player: any,
    sessionId: string,
  ): {
    ok: boolean;
    reason?: string;
    gainedMs?: number;
    status: ReturnType<VoteSystem["getPlayerVoteStatus"]>;
  } {
    const now = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
    const normalizedSessionId = asNonEmptyString(sessionId);
    if (!normalizedSessionId) {
      return {
        ok: false,
        reason: "Vote session id is required.",
        status: this.getPlayerVoteStatus(player),
      };
    }
    const progress = this.ensurePlayerVoteProgress(player);
    const session = progress.pendingSessions.find((s) => s.id === normalizedSessionId);
    if (!session) {
      return { ok: false, reason: "Vote session not found.", status: this.getPlayerVoteStatus(player) };
    }
    if (session.playerId !== player.id) {
      return { ok: false, reason: "Vote session belongs to another player.", status: this.getPlayerVoteStatus(player) };
    }
    if (session.status === "claimed") {
      return { ok: false, reason: "Vote session already claimed.", status: this.getPlayerVoteStatus(player) };
    }
    if (session.status !== "verified") {
      return { ok: false, reason: "Vote session is not verified yet.", status: this.getPlayerVoteStatus(player) };
    }

    const banner = this.bannerStore.getById(session.bannerId);
    if (!banner) {
      session.status = "expired";
      return { ok: false, reason: "Vote banner no longer exists.", status: this.getPlayerVoteStatus(player) };
    }

    const cooldownMs = toMs(banner.cooldownHours);
    const lastClaimAt = asFiniteNumber(progress.lastClaimByBanner[banner.internalId], 0);
    if (lastClaimAt > 0 && now < lastClaimAt + cooldownMs) {
      return { ok: false, reason: "Vote banner still on daily cooldown.", status: this.getPlayerVoteStatus(player) };
    }

    const duplicate = progress.rewardHistory.find((h) => h.sessionId === session.id);
    if (duplicate) {
      session.status = "claimed";
      session.claimedAt = duplicate.claimedAt;
      return { ok: false, reason: "Vote session reward already processed.", status: this.getPlayerVoteStatus(player) };
    }

    const buffDurationMs = toMs(banner.buffHours);
    const chainTail = Math.max(
      now,
      ...progress.activeBuffBlocks
        .map((b) => asFiniteNumber(b.expiresAt, 0))
        .filter((v) => v > 0),
    );
    const startedAt = chainTail;
    const expiresAt = startedAt + buffDurationMs;
    const buffBlock: VoteBuffBlock = {
      id: `vb_${randomUUID()}`,
      bannerId: banner.internalId,
      providerKey: banner.providerKey,
      sessionId: session.id,
      startedAt,
      expiresAt,
      multiplier: 2,
    };
    progress.activeBuffBlocks.push(buffBlock);
    progress.lastClaimByBanner[banner.internalId] = now;
    session.status = "claimed";
    session.claimedAt = now;

    const historyEntry: VoteHistoryEntry = {
      id: `vh_${randomUUID()}`,
      bannerId: banner.internalId,
      providerKey: banner.providerKey,
      sessionId: session.id,
      claimedAt: now,
      verifiedAt: asFiniteNumber(session.verifiedAt, now),
      providerVoteId: session.providerVoteId,
      multiplier: 2,
      durationMs: buffDurationMs,
    };
    progress.rewardHistory.push(historyEntry);
    if (progress.rewardHistory.length > 250) {
      progress.rewardHistory = progress.rewardHistory.slice(-250);
    }

    this.appendAudit(progress.auditLog, {
      at: now,
      action: "claim_ok",
      bannerId: banner.internalId,
      sessionId: session.id,
      detail: `+${Math.round(buffDurationMs / 3600000)}h`,
    });
    this.pruneState(player, now);
    return { ok: true, gainedMs: buffDurationMs, status: this.getPlayerVoteStatus(player) };
  }

  markCallbackVerified(
    players: any[],
    payload: {
      sessionId: string;
      callbackToken: string;
      providerKey?: string;
      bannerId?: string;
      providerVoteId?: string;
      evidence?: Record<string, unknown>;
    },
  ): {
    ok: boolean;
    reason?: string;
    playerId?: string;
    bannerId?: string;
    sessionId?: string;
  } {
    const sessionId = asNonEmptyString(payload.sessionId);
    const token = asNonEmptyString(payload.callbackToken);
    if (!sessionId || !token) {
      return { ok: false, reason: "sessionId and callbackToken are required." };
    }

    const now = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
    for (const player of players) {
      const progress = this.ensurePlayerVoteProgress(player);
      const session = progress.pendingSessions.find((s) => s.id === sessionId);
      if (!session) continue;
      if (session.callbackToken !== token) {
        return { ok: false, reason: "Invalid callback token." };
      }
      if (session.expiresAt <= now) {
        session.status = "expired";
        return { ok: false, reason: "Vote session expired." };
      }
      if (payload.providerKey && payload.providerKey !== session.providerKey) {
        return { ok: false, reason: "Provider mismatch." };
      }
      if (payload.bannerId && payload.bannerId !== session.bannerId) {
        return { ok: false, reason: "Banner mismatch." };
      }
      if (session.status !== "claimed") {
        session.status = "verified";
        session.verifiedAt = now;
      }
      if (asNonEmptyString(payload.providerVoteId)) {
        session.providerVoteId = payload.providerVoteId;
      }
      session.providerEvidence = {
        ...(session.providerEvidence ?? {}),
        ...(payload.evidence ?? {}),
        callbackConfirmed: true,
        callbackAt: now,
      };
      this.appendAudit(progress.auditLog, {
        at: now,
        action: "callback_verified",
        bannerId: session.bannerId,
        sessionId: session.id,
      });
      return {
        ok: true,
        playerId: player.id,
        bannerId: session.bannerId,
        sessionId: session.id,
      };
    }
    return { ok: false, reason: "Vote session not found." };
  }

  getXpMultiplier(player: any, now = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */): number {
    const buff = this.getBuffState(player, now);
    return buff.activeMultiplier;
  }

  getBuffState(player: any, now = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */): VoteBuffState {
    const progress = this.ensurePlayerVoteProgress(player);
    this.pruneState(player, now);
    const blocks = progress.activeBuffBlocks
      .filter((b) => b.expiresAt > now)
      .sort((a, b) => a.startedAt - b.startedAt);
    const hasActive = blocks.some((b) => b.startedAt <= now && b.expiresAt > now);
    const horizon = blocks.reduce((max, b) => Math.max(max, b.expiresAt), now);
    return {
      activeMultiplier: hasActive ? 2 : 1,
      totalRemainingMs: Math.max(0, horizon - now),
      blocks: blocks.map((b) => ({
        id: b.id,
        bannerId: b.bannerId,
        providerKey: b.providerKey,
        expiresAt: b.expiresAt,
        remainingMs: Math.max(0, b.expiresAt - now),
      })),
    };
  }

  getAdminDiagnostics(players: any[], limit = 120): {
    recentClaims: Array<{
      playerId: string;
      bannerId: string;
      providerKey: string;
      claimedAt: number;
      durationMs: number;
      sessionId: string;
    }>;
    pendingSessions: Array<{
      playerId: string;
      sessionId: string;
      bannerId: string;
      providerKey: string;
      status: VoteSession["status"];
      expiresAt: number;
    }>;
  } {
    const claims: Array<{
      playerId: string;
      bannerId: string;
      providerKey: string;
      claimedAt: number;
      durationMs: number;
      sessionId: string;
    }> = [];
    const pending: Array<{
      playerId: string;
      sessionId: string;
      bannerId: string;
      providerKey: string;
      status: VoteSession["status"];
      expiresAt: number;
    }> = [];
    for (const player of players) {
      const progress = this.ensurePlayerVoteProgress(player);
      for (const row of progress.rewardHistory) {
        claims.push({
          playerId: player.id,
          bannerId: row.bannerId,
          providerKey: row.providerKey,
          claimedAt: row.claimedAt,
          durationMs: row.durationMs,
          sessionId: row.sessionId,
        });
      }
      for (const row of progress.pendingSessions) {
        if (row.status === "claimed" || row.status === "expired") continue;
        pending.push({
          playerId: player.id,
          sessionId: row.id,
          bannerId: row.bannerId,
          providerKey: row.providerKey,
          status: row.status,
          expiresAt: row.expiresAt,
        });
      }
    }
    claims.sort((a, b) => b.claimedAt - a.claimedAt);
    pending.sort((a, b) => b.expiresAt - a.expiresAt);
    return {
      recentClaims: claims.slice(0, limit),
      pendingSessions: pending.slice(0, limit),
    };
  }

  private appendAudit(list: VoteAuditEntry[], entry: VoteAuditEntry): void {
    list.push(entry);
    if (list.length > 250) {
      list.splice(0, list.length - 250);
    }
  }

  private pruneState(player: any, now: number): void {
    const progress = ensurePlayerVoteProgress(player);
    progress.activeBuffBlocks = progress.activeBuffBlocks
      .filter(
        (b) =>
          Number.isFinite(b.expiresAt) &&
          b.expiresAt > now - 5 * 60_000 &&
          Number.isFinite(b.startedAt) &&
          b.expiresAt > b.startedAt,
      )
      .sort((a, b) => a.startedAt - b.startedAt);

    progress.pendingSessions = progress.pendingSessions
      .map((s) => {
        if (!Number.isFinite(s.expiresAt) || s.expiresAt <= now) {
          return { ...s, status: "expired" as const };
        }
        return s;
      })
      .filter(
        (s) =>
          s.status !== "expired" ||
          asFiniteNumber(s.expiresAt, 0) > now - 2 * 24 * 60 * 60 * 1000,
      );

    if (progress.rewardHistory.length > 250) {
      progress.rewardHistory = progress.rewardHistory.slice(-250);
    }
    if (progress.auditLog.length > 250) {
      progress.auditLog = progress.auditLog.slice(-250);
    }
  }
}

