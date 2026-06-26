import { describe, expect, it } from "vitest";
import { CampQuestService, type CampQuestCompletionPersistence } from "../quests/CampQuestService.js";
import { CAMP_QUEST_CYCLE_TICKS, campQuestIdFor, resolveCampQuestRequirement } from "../quests/CampQuestDirector.js";
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

class FakeInventoryService {
  public itemId = "";
  public quantity = 0;
  public removeCount = 0;

  constructor(private hasRequiredItems: boolean) {}

  async hasItems(input: { items: Array<{ itemId: string; quantity: number }> }): Promise<boolean> {
    this.itemId = input.items[0]?.itemId ?? "";
    this.quantity = input.items[0]?.quantity ?? 0;
    return this.hasRequiredItems;
  }

  async removeItem(input: { itemId: string; quantity: number }) {
    this.removeCount += 1;
    return { ok: true, playerId: "player_001", itemId: input.itemId, quantity: input.quantity, reason: "removed" as const };
  }
}

class FakeWalletService {
  public coinsAdded = 0;
  public addCount = 0;

  async addCoins(input: { amount: number }) {
    this.addCount += 1;
    this.coinsAdded += input.amount;
    return { playerId: "player_001", balances: { coin: this.coinsAdded } };
  }
}

class FakeDiscoveryService {
  public hydrateCount = 0;

  constructor(private readonly discoveredPoiIds: readonly string[]) {}

  async hydratePlayer(_playerId: string): Promise<void> {
    this.hydrateCount += 1;
  }

  isPoiDiscovered(_playerId: string, poiId: string): boolean {
    return this.discoveredPoiIds.includes(poiId);
  }
}

class FakeHistoryLog {
  public writes: unknown[] = [];

  write(input: unknown) {
    this.writes.push(input);
    return { schemaVersion: 1 as const, sequence: this.writes.length - 1, tick: 0, source: "quest_delta" as const, actorId: "player_001", subjectId: "quest", chunkKey: "0:0", payloadHash: "payload", entryHash: "history_hash" };
  }
}

class FakeCompletionPersistence implements CampQuestCompletionPersistence {
  public saved: readonly string[] = Object.freeze([]);
  public loadCount = 0;
  public saveCount = 0;

  constructor(initial: readonly string[] = []) {
    this.saved = Object.freeze([...initial].sort());
  }

  async loadCompletedQuestIds(_playerId: string): Promise<readonly string[]> {
    this.loadCount += 1;
    return this.saved;
  }

  async saveCompletedQuestIds(_playerId: string, questIds: readonly string[]): Promise<void> {
    this.saveCount += 1;
    this.saved = Object.freeze([...questIds].sort());
  }
}

function createService(input: {
  readonly inventory?: FakeInventoryService;
  readonly wallet?: FakeWalletService;
  readonly discovery?: FakeDiscoveryService;
  readonly history?: FakeHistoryLog;
  readonly persistence?: FakeCompletionPersistence;
}): CampQuestService {
  return new CampQuestService(
    (input.inventory ?? new FakeInventoryService(true)) as any,
    (input.wallet ?? new FakeWalletService()) as any,
    (input.discovery ?? new FakeDiscoveryService([])) as any,
    (input.history ?? new FakeHistoryLog()) as any,
    input.persistence ?? new FakeCompletionPersistence(),
  );
}

describe("CampQuestService", () => {
  it("completes an authoritative discovered camp quest by consuming inventory and granting coins", async () => {
    const camp = findAuthoritativeCamp();
    const playerId = "player_001";
    const currentTick = 0;
    const questId = campQuestIdFor(camp.poi.id, currentTick);
    const requirement = resolveCampQuestRequirement({ playerId, poiId: camp.poi.id, poiType: camp.poiType, logicalIndex: currentTick });
    const inventory = new FakeInventoryService(true);
    const wallet = new FakeWalletService();
    const history = new FakeHistoryLog();
    const persistence = new FakeCompletionPersistence();
    const service = createService({ inventory, wallet, discovery: new FakeDiscoveryService([camp.poi.id]), history, persistence });

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
    expect(result.coinsGranted).toBeGreaterThan(0);
    expect(inventory.removeCount).toBe(1);
    expect(wallet.coinsAdded).toBe(result.coinsGranted);
    expect(history.writes).toHaveLength(1);
    expect(await service.getCompletedQuestIds(playerId)).toContain(questId);
    expect(persistence.saved).toContain(questId);
  });

  it("hydrates persisted completion ids before exposing completed quest ids", async () => {
    const camp = findAuthoritativeCamp();
    const playerId = "player_001";
    const questId = campQuestIdFor(camp.poi.id, 0);
    const persistence = new FakeCompletionPersistence([questId]);
    const service = createService({ persistence });

    expect(await service.getCompletedQuestIds(playerId)).toContain(questId);
    expect(persistence.loadCount).toBe(1);
  });

  it("rejects a persisted completed quest before mutating inventory", async () => {
    const camp = findAuthoritativeCamp();
    const playerId = "player_001";
    const questId = campQuestIdFor(camp.poi.id, 0);
    const inventory = new FakeInventoryService(true);
    const wallet = new FakeWalletService();
    const service = createService({
      inventory,
      wallet,
      discovery: new FakeDiscoveryService([camp.poi.id]),
      persistence: new FakeCompletionPersistence([questId]),
    });

    const result = await service.completeCampQuest({ playerId, questId, playerPosition: camp.poi.position, currentTick: 0 });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("quest_already_completed");
    expect(inventory.removeCount).toBe(0);
    expect(wallet.addCount).toBe(0);
  });

  it("serializes parallel completion requests for one player quest", async () => {
    const camp = findAuthoritativeCamp();
    const playerId = "player_001";
    const questId = campQuestIdFor(camp.poi.id, 0);
    const inventory = new FakeInventoryService(true);
    const wallet = new FakeWalletService();
    const service = createService({ inventory, wallet, discovery: new FakeDiscoveryService([camp.poi.id]) });

    const [first, second] = await Promise.all([
      service.completeCampQuest({ playerId, questId, playerPosition: camp.poi.position, currentTick: 0 }),
      service.completeCampQuest({ playerId, questId, playerPosition: camp.poi.position, currentTick: 0 }),
    ]);

    expect([first.reason, second.reason].sort()).toEqual(["completed", "quest_already_completed"].sort());
    expect(inventory.removeCount).toBe(1);
    expect(wallet.addCount).toBe(1);
  });

  it("rejects undiscovered camps after hydrating discovery and before mutating inventory", async () => {
    const camp = findAuthoritativeCamp();
    const inventory = new FakeInventoryService(true);
    const discovery = new FakeDiscoveryService([]);
    const service = createService({ inventory, discovery });

    const result = await service.completeCampQuest({
      playerId: "player_001",
      questId: campQuestIdFor(camp.poi.id, 0),
      playerPosition: camp.poi.position,
      currentTick: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("poi_not_discovered");
    expect(discovery.hydrateCount).toBe(1);
    expect(inventory.removeCount).toBe(0);
  });

  it("rejects stale camp quest cycles", async () => {
    const camp = findAuthoritativeCamp();
    const service = createService({ discovery: new FakeDiscoveryService([camp.poi.id]) });

    const result = await service.completeCampQuest({
      playerId: "player_001",
      questId: campQuestIdFor(camp.poi.id, 0),
      playerPosition: camp.poi.position,
      currentTick: CAMP_QUEST_CYCLE_TICKS,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid_cycle");
  });

  it("rejects completion when the player is too far from the camp", async () => {
    const camp = findAuthoritativeCamp();
    const service = createService({ discovery: new FakeDiscoveryService([camp.poi.id]) });

    const result = await service.completeCampQuest({
      playerId: "player_001",
      questId: campQuestIdFor(camp.poi.id, 0),
      playerPosition: { x: camp.poi.position.x + 10_000, y: camp.poi.position.y + 10_000 },
      currentTick: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("camp_too_far");
  });

  it("rejects missing delivery resources before wallet reward", async () => {
    const camp = findAuthoritativeCamp();
    const wallet = new FakeWalletService();
    const service = createService({
      inventory: new FakeInventoryService(false),
      wallet,
      discovery: new FakeDiscoveryService([camp.poi.id]),
    });

    const result = await service.completeCampQuest({
      playerId: "player_001",
      questId: campQuestIdFor(camp.poi.id, 0),
      playerPosition: camp.poi.position,
      currentTick: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("insufficient_items");
    expect(wallet.coinsAdded).toBe(0);
  });
});
