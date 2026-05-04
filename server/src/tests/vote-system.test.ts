// @ts-nocheck
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoteBannerStore } from "../modules/vote/VoteBannerStore.js";
import { VoteSystem } from "../modules/vote/VoteSystem.js";

function mkPlayer(id: string) {
  return {
    id,
    xp: 0,
    voteProgress: {
      lastClaimByBanner: {},
      pendingSessions: [],
      activeBuffBlocks: [],
      rewardHistory: [],
      auditLog: [],
    },
  };
}

describe("VoteSystem", () => {
  let rootDir = "";
  let bannersFile = "";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "vote-system-test-"));
    bannersFile = path.join(rootDir, "vote-banners.json");
    fs.writeFileSync(bannersFile, "[]\n", "utf8");
  });

  afterEach(() => {
    vi.useRealTimers();
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  it("verifies callback session and grants buff on claim", () => {
    const store = new VoteBannerStore(bannersFile);
    const system = new VoteSystem(store);
    const player = mkPlayer("player_a");

    const banner = system.upsertBanner({
      providerKey: "provider-a",
      displayName: "Vote A",
      bannerImage: "https://example.com/banner-a.png",
      targetUrl: "https://example.com/vote-a",
      verificationMode: "callback_token",
      cooldownHours: 24,
      buffHours: 4,
    });

    const created = system.createVoteSession(player, banner.internalId, "https://game.example.com");
    expect(created.ok).toBe(true);
    expect(created.session).toBeTruthy();

    const callback = system.markCallbackVerified([player], {
      sessionId: created.session!.id,
      callbackToken: created.session!.callbackToken,
      bannerId: banner.internalId,
      providerKey: banner.providerKey,
      providerVoteId: "vote-123",
      evidence: { remote: true },
    });
    expect(callback.ok).toBe(true);

    const claim = system.claimSession(player, created.session!.id);
    expect(claim.ok).toBe(true);
    expect(claim.gainedMs).toBe(4 * 60 * 60 * 1000);

    const buff = system.getBuffState(player);
    expect(buff.activeMultiplier).toBe(2);
    expect(buff.totalRemainingMs).toBe(4 * 60 * 60 * 1000);
  });

  it("enforces per-banner cooldown and stacks duration across banners", () => {
    const store = new VoteBannerStore(bannersFile);
    const system = new VoteSystem(store);
    const player = mkPlayer("player_b");

    const bannerA = system.upsertBanner({
      providerKey: "provider-a",
      displayName: "Vote A",
      bannerImage: "https://example.com/banner-a.png",
      targetUrl: "https://example.com/vote-a",
      verificationMode: "callback_token",
      cooldownHours: 24,
      buffHours: 4,
      sortOrder: 0,
    });
    const bannerB = system.upsertBanner({
      providerKey: "provider-b",
      displayName: "Vote B",
      bannerImage: "https://example.com/banner-b.png",
      targetUrl: "https://example.com/vote-b",
      verificationMode: "callback_token",
      cooldownHours: 24,
      buffHours: 4,
      sortOrder: 1,
    });

    const openA = system.createVoteSession(player, bannerA.internalId, "https://game.example.com");
    expect(openA.ok).toBe(true);
    const verifyA = system.markCallbackVerified([player], {
      sessionId: openA.session!.id,
      callbackToken: openA.session!.callbackToken,
    });
    expect(verifyA.ok).toBe(true);
    const claimA = system.claimSession(player, openA.session!.id);
    expect(claimA.ok).toBe(true);

    const blockedSecondA = system.createVoteSession(player, bannerA.internalId, "https://game.example.com");
    expect(blockedSecondA.ok).toBe(false);
    expect(blockedSecondA.reason).toMatch(/cooldown/i);

    const openB = system.createVoteSession(player, bannerB.internalId, "https://game.example.com");
    expect(openB.ok).toBe(true);
    const verifyB = system.markCallbackVerified([player], {
      sessionId: openB.session!.id,
      callbackToken: openB.session!.callbackToken,
    });
    expect(verifyB.ok).toBe(true);
    const claimB = system.claimSession(player, openB.session!.id);
    expect(claimB.ok).toBe(true);

    const buff = system.getBuffState(player);
    expect(buff.activeMultiplier).toBe(2);
    expect(buff.totalRemainingMs).toBe(8 * 60 * 60 * 1000);
    expect(buff.blocks).toHaveLength(2);
  });
});
