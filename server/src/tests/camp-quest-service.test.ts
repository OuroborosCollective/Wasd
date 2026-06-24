import { describe, expect, it, vi } from "vitest";
import { CampQuestService } from "../quests/CampQuestService.js";
import { CAMP_QUEST_CYCLE_TICKS, campQuestIdFor, resolveCampQuestRequirement, resolveCampQuestReward } from "../quests/CampQuestDirector.js";
import { CHUNK_POI_CONSTANTS, deriveChunkBiome, generateChunkPois } from "../world/WorldPoiGenerator.js";
import type { WorldPoiSnapshot } from "../world/WorldPoiTypes.js";
import type { GatheringCampPoiType } from "../quests/CampQuestDirector.js";

function findAuthoritativeCamp(): { poi: WorldPoiSnapshot; poiType: GatheringCampPoiType } {
  for (let chunkX = -8; chunkX <= 8; chunkX += 1) {
    for (let chunkZ = -8; chunkZ <= 8; chunkZ += 1) {
      const biomeId = deriveChunkBiome(chunkX, chunkZ);
      const pois = generateChunkPois({ chunkX, chunkZ, biomeId, worldSeed: CHUNK_POI_CONSTANTS.WORLD_SEED });
      const poi = pois.find((candidate) =>
        candidate.type === "logging_camp" || candidate.type === "mining_camp" || candidate.type === "fishing_camp",
      );
      if (poi && (poi.type === "logging_camp" || poi.type === "mining_camp" || poi.type === "fishing_camp")) {
        return { poi, poiType: poi.type };
      }
    }
  }
  throw new Error("No deterministic gathering camp found in test scan range");
}

function expectedGatheringSkill(poiType: GatheringCampPoiType): "woodcutting" | "mining" | "fishing" {
  if (poiType === "logging_camp") return "woodcutting";
  if (poiType === "mining_camp") return "mining";
  return "fishing";
}

class FakeInventoryService {
  public itemId = "";
  public quantity = 0;
  public removed = false;

  constructor(private hasRequiredItems: boolean) {}

  async hasItems(input: { items: Array<{ itemId: string; quantity: number }> }): Promise<boolean> {
    this.itemId = input.items[0]?.itemId ?? "";
    this.quantity = input.items[0]?.quantity ?? 0;
    return this.hasRequiredItems;
  }

  async removeItem(input: { itemId: string; quantity: number }) {
    this.removed = true;
    return { ok: true, playerId: "player_001", itemId: input.itemId, quantity: input.quantity, reason: "removed" as const };
  }
}

class FakeWalletService {
  public coinsAdded = 0;

  async addCoins(input: { amount: number }) {
    this.coinsAdded += input.amount;
    return { playerId: "player_001", schemaVersion: 1 as const, balances: { coin: this.coinsAdded } };
  }
}

class FakeSkillProgressionService {
  public events: Array<{ skillId: string; amount: number; source: string }> = [];

  async applyEvent(input: { skillId: string; amount: number; source: string }) {
    this.events.push({ skillId: input.skillId, amount: input.amount, source: input.source });
    return { playerId: "player_001", schemaVersion: 1 as const, skills: [] };
  }
}

class FailingSkillProgressionService {
  public events: Array<{ skillId: string; amount: number; source: string }> = [];

  async applyEvent(input: { skillId: string; amount: number; source: string }) {
    this.events.push({ skillId: input.skillId, amount: input.amount, source: input.source });
    throw new Error("skill persistence unavailable");
  }
}

class FakeDiscoveryService {
  constructor(private readonly discoveredPoiIds: readonly string[]) {}

  isPoiDiscovered(_playerId: string, poiId: string): boolean {
    return this.discoveredPoiIds.includes(poiId);
  }
}

class FakeHistoryLog {
  public writes: unknown[] = [];

  write(input: unknown) {
    this.writes.push(input);
    return {
      schemaVersion: 1 as const,
      sequence: this.writes.length - 1,
      tick: 0,
      source: "quest_delta" as const,
      actorId: "player_001",
      subjectId: "quest",
      chunkKey: "0:0",
      payloadHash: "payload",
      entryHash: "history_hash",
    };
  }
}

describe("CampQuestService", () => {
  it("completes an authoritative discovered camp quest by consuming inventory and granting coins plus XP", async () => {
    const camp = findAuthoritativeCamp();
    const playerId = "player_001";
    const currentTick = 0;
    const questId = campQuestIdFor(camp.poi.id, currentTick);
    const requirement = resolveCampQuestRequirement({ playerId, poiId: camp.poi.id, poiType: camp.poiType, logicalIndex: currentTick });
    const reward = resolveCampQuestReward({ playerId, poiId: camp.poi.id, poiType: camp.poiType, logicalIndex: currentTick });
    const inventory = new FakeInventoryService(true);
    const wallet = new FakeWalletService();
    const history = new FakeHistoryLog();
    const skills = new FakeSkillProgressionService();
    const service = new CampQuestService(
      inventory as any,
      wallet as any,
      new FakeDiscoveryService([camp.poi.id]) as any,
      history as any,
      { getSkillProgressionService: async () => skills as any },
    );

    const result = await service.completeCampQuest({
      playerId,
      questId,
      playerPosition: camp.poi.position,
      currentTick,
    });

    expect(result.ok).toBe(true);
    expect(result.reason).toBe("completed");
    expect(result.questId).toBe(questId);
    expect(result.itemId).toBe(requirement.itemId);
    expect(result.quantity).toBe(requirement.quantity);
    expect(result.coinsGranted).toBe(reward.coins);
    expect(result.skillRewardStatus).toBe("applied");
    expect(inventory.removed).toBe(true);
    expect(wallet.coinsAdded).toBe(result.coinsGranted);
    expect(history.writes).toHaveLength(1);
    expect(service.getCompletedQuestIds(playerId)).toContain(questId);
    expect(result.skillXpGranted).toContainEqual({ skillId: expectedGatheringSkill(camp.poiType), amount: reward.gatheringXp });
    expect(skills.events).toContainEqual({ skillId: expectedGatheringSkill(camp.poiType), amount: reward.gatheringXp, source: "quest_reward" });
    if (reward.craftingXp > 0) {
      expect(result.skillXpGranted).toContainEqual({ skillId: "crafting", amount: reward.craftingXp });
      expect(skills.events).toContainEqual({ skillId: "crafting", amount: reward.craftingXp, source: "quest_reward" });
    }
  });

  it("keeps completion stable and honest when skill XP persistence fails", async () => {
    const camp = findAuthoritativeCamp();
    const playerId = "player_001";
    const currentTick = 0;
    const questId = campQuestIdFor(camp.poi.id, currentTick);
    const inventory = new FakeInventoryService(true);
    const wallet = new FakeWalletService();
    const history = new FakeHistoryLog();
    const skills = new FailingSkillProgressionService();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const service = new CampQuestService(
      inventory as any,
      wallet as any,
      new FakeDiscoveryService([camp.poi.id]) as any,
      history as any,
      { getSkillProgressionService: async () => skills as any },
    );

    const result = await service.completeCampQuest({
      playerId,
      questId,
      playerPosition: camp.poi.position,
      currentTick,
    });

    expect(result.ok).toBe(true);
    expect(result.reason).toBe("completed");
    expect(result.skillRewardStatus).toBe("failed");
    expect(result.skillXpGranted).toEqual([]);
    expect(inventory.removed).toBe(true);
    expect(wallet.coinsAdded).toBe(result.coinsGranted);
    expect(history.writes).toHaveLength(1);
    expect(service.getCompletedQuestIds(playerId)).toContain(questId);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("rejects undiscovered camps before mutating inventory", async () => {
    const camp = findAuthoritativeCamp();
    const inventory = new FakeInventoryService(true);
    const service = new CampQuestService(
      inventory as any,
      new FakeWalletService() as any,
      new FakeDiscoveryService([]) as any,
      new FakeHistoryLog() as any,
    );

    const result = await service.completeCampQuest({
      playerId: "player_001",
      questId: campQuestIdFor(camp.poi.id, 0),
      playerPosition: camp.poi.position,
      currentTick: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("poi_not_discovered");
    expect(result.skillRewardStatus).toBe("skipped");
    expect(result.skillXpGranted).toEqual([]);
    expect(inventory.removed).toBe(false);
  });

  it("rejects stale camp quest cycles", async () => {
    const camp = findAuthoritativeCamp();
    const service = new CampQuestService(
      new FakeInventoryService(true) as any,
      new FakeWalletService() as any,
      new FakeDiscoveryService([camp.poi.id]) as any,
      new FakeHistoryLog() as any,
    );

    const result = await service.completeCampQuest({
      playerId: "player_001",
      questId: campQuestIdFor(camp.poi.id, 0),
      playerPosition: camp.poi.position,
      currentTick: CAMP_QUEST_CYCLE_TICKS,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid_cycle");
    expect(result.skillRewardStatus).toBe("skipped");
    expect(result.skillXpGranted).toEqual([]);
  });

  it("rejects completion when the player is too far from the camp", async () => {
    const camp = findAuthoritativeCamp();
    const service = new CampQuestService(
      new FakeInventoryService(true) as any,
      new FakeWalletService() as any,
      new FakeDiscoveryService([camp.poi.id]) as any,
      new FakeHistoryLog() as any,
    );

    const result = await service.completeCampQuest({
      playerId: "player_001",
      questId: campQuestIdFor(camp.poi.id, 0),
      playerPosition: { x: camp.poi.position.x + 10_000, y: camp.poi.position.y + 10_000 },
      currentTick: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("camp_too_far");
    expect(result.skillRewardStatus).toBe("skipped");
    expect(result.skillXpGranted).toEqual([]);
  });

  it("rejects missing delivery resources before wallet reward", async () => {
    const camp = findAuthoritativeCamp();
    const wallet = new FakeWalletService();
    const skills = new FakeSkillProgressionService();
    const service = new CampQuestService(
      new FakeInventoryService(false) as any,
      wallet as any,
      new FakeDiscoveryService([camp.poi.id]) as any,
      new FakeHistoryLog() as any,
      { getSkillProgressionService: async () => skills as any },
    );

    const result = await service.completeCampQuest({
      playerId: "player_001",
      questId: campQuestIdFor(camp.poi.id, 0),
      playerPosition: camp.poi.position,
      currentTick: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("insufficient_items");
    expect(result.skillRewardStatus).toBe("skipped");
    expect(result.skillXpGranted).toEqual([]);
    expect(wallet.coinsAdded).toBe(0);
    expect(skills.events).toHaveLength(0);
  });
});
