import { describe, it, expect } from "vitest";
import {
  canUseImpactBuster,
  executeImpactBuster,
} from "../core/ImpactBusterHandler.js";
import { WorldBossDungeonSystem } from "../core/WorldBossDungeonSystem.js";

function mkPlayer(id: string, name: string) {
  return {
    id,
    name,
    dead: false,
    level: 8,
    stamina: 100,
    mana: 25,
    position: { x: 0, y: 0, z: 0 },
    skillCooldowns: {},
    impactBusterUnlocked: false,
    worldBossProgress: {
      firstClearAt: 0,
      totalClears: 0,
      clearedDungeonIds: [],
      rewardHistory: [],
    },
    pendingRewards: [],
    equipment: { weapon: null, armor: null, offHand: null },
    gearInventory: [],
  };
}

describe("worldboss + impact buster integration helpers", () => {
  it("blocks Impact Buster before unlock and allows after unlock", () => {
    const now = Date.now();
    const player = mkPlayer("p1", "Tester");
    const locked = canUseImpactBuster(player, now);
    expect(locked.ok).toBe(false);
    expect(locked.reason).toBe("locked");

    player.impactBusterUnlocked = true;
    const unlocked = canUseImpactBuster(player, now);
    expect(unlocked.ok).toBe(true);
  });

  it("applies AoE damage with cooldown+stamina on execute", () => {
    const now = Date.now();
    const player = mkPlayer("p1", "Tester");
    player.impactBusterUnlocked = true;
    const npcs = [
      { id: "n1", health: 300, maxHealth: 300, position: { x: 1, y: 1 } },
      { id: "n2", health: 300, maxHealth: 300, position: { x: 20, y: 20 } },
    ];
    const result = executeImpactBuster(player, npcs, now);
    expect(result.hits.some((h) => h.npcId === "n1")).toBe(true);
    expect(result.hits.some((h) => h.npcId === "n2")).toBe(false);
    expect(player.stamina).toBeLessThan(100);
    expect(player.skillCooldowns.__impactBuster).toBeGreaterThan(now);
  });

  it("awards top-5 and unlocks on first worldboss clear", () => {
    const system = new WorldBossDungeonSystem();
    const players = new Map<string, any>();
    const roster = Array.from({ length: 6 }, (_, idx) => {
      const p = mkPlayer(`p${idx + 1}`, `Player${idx + 1}`);
      p.impactBusterUnlocked = idx === 5; // last player already unlocked
      players.set(p.id, p);
      return p;
    });
    const cfg = system.buildBossSpawnConfig();
    const bossNpc = {
      id: cfg.npcId,
      health: cfg.stats.health,
      maxHealth: cfg.stats.maxHealth,
      worldBossMeta: cfg.worldBossMeta,
    };
    system.maybeStartEncounterIfMissing(bossNpc);
    for (let i = 0; i < roster.length; i++) {
      const p = roster[i];
      // descending damage for deterministic ranking
      system.noteEncounterDamage(p, bossNpc, 1000 - i * 100);
      system.noteEncounterDamage(p, bossNpc, 200);
    }

    const summary = system.finalizeBossDefeat({
      bossNpc,
      playersById: players,
      grantWeaponReward: (p) => {
        const hist = p.worldBossProgress.rewardHistory as string[];
        if (hist.includes("mega_iron_fist_frustinator")) return false;
        hist.push("mega_iron_fist_frustinator");
        return true;
      },
      grantUnlock: (p) => {
        if (p.impactBusterUnlocked) return false;
        p.impactBusterUnlocked = true;
        return true;
      },
    });

    expect(summary).toBeTruthy();
    expect(summary!.topRewards).toHaveLength(5);
    expect(summary!.topRewards.every((r) => r.rank <= 5)).toBe(true);
    expect(roster[0].impactBusterUnlocked).toBe(true);
    expect(roster[5].impactBusterUnlocked).toBe(true);
    expect(roster[0].worldBossProgress.totalClears).toBe(1);
  });
});
