import { describe, expect, it } from "vitest";
import {
  FamilyHouseRegistry,
  NPCLineageManager,
  type HouseState,
  type LineageBirthEvent,
  type LineageStats,
  type NPCState,
  type SettlementState,
} from "./FamilyHouseRegistry";
import { NPC_LINEAGE_GAME_DATA_PATH, NpcLineageGameDataWriter, type NpcLineageStorageProvider } from "./LineageGameDataWriter";

function stats(seed = 10): LineageStats {
  return {
    strength: seed,
    agility: seed + 1,
    intelligence: seed + 2,
    stamina: seed + 3,
    charisma: seed + 4,
    luck: seed + 5,
  };
}

function house(id = "house_1", settlementId = "settlement_1"): HouseState {
  return {
    id,
    houseName: `House ${id}`,
    houseReputation: 50,
    inheritancePoints: 50,
    settlementId,
    foundingTick: 0,
    territorySize: 5,
    resourceStored: 100,
    housingCapacity: 10,
    currentPopulation: 1,
    isActive: true,
  };
}

function settlement(overrides: Partial<SettlementState> = {}): SettlementState {
  return {
    id: "settlement_1",
    capacity: 100,
    population: 10,
    foodSupply: 100,
    housingUnits: 20,
    settlementType: "village",
    tick: 1000,
    ...overrides,
  };
}

function npc(id: string): NPCState {
  return {
    id,
    houseId: "house_1",
    settlementId: "settlement_1",
    stats: stats(id.charCodeAt(0)),
    traits: ["tester"],
    generation: 0,
    birthTick: 0,
  };
}

class MemoryProvider implements NpcLineageStorageProvider {
  writes: Array<{ target: string; content: string }> = [];
  private data: string | null = null;

  read(_target: string): string | null {
    return this.data;
  }

  write(target: string, content: string): void {
    this.data = content;
    this.writes.push({ target, content });
  }
}

describe("lineage game-data truth path", () => {
  it("writes 0 lineage events when the real settlement is full", () => {
    const registry = new FamilyHouseRegistry();
    registry.registerHouse(house());
    const events: LineageBirthEvent[] = [];
    const manager = new NPCLineageManager(registry, { record: (event) => events.push(event) });

    expect(() => manager.createDescendant(npc("parent_a"), npc("parent_b"), "house_1", settlement({ population: 100, capacity: 100 }), 1000))
      .toThrow("npc_pair_not_eligible:settlement_full");

    expect(registry.getBirthEvents()).toHaveLength(0);
    expect(events).toHaveLength(0);
  });

  it("writes exactly 1 lineage event for a real eligible birth", () => {
    const registry = new FamilyHouseRegistry();
    registry.registerHouse(house());
    const provider = new MemoryProvider();
    const writer = new NpcLineageGameDataWriter(provider);
    const manager = new NPCLineageManager(registry, writer);

    const descendant = manager.createDescendant(npc("parent_a"), npc("parent_b"), "house_1", settlement(), 1000);

    expect(registry.getBirthEvents()).toHaveLength(1);
    expect(provider.writes).toHaveLength(1);
    expect(provider.writes[0].target).toBe(NPC_LINEAGE_GAME_DATA_PATH);

    const persisted = JSON.parse(provider.writes[0].content) as Array<Record<string, unknown>>;
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toMatchObject({
      lineageId: descendant.id,
      lineageHash: descendant.lineageHash,
      settlementId: "settlement_1",
      birthTick: 1000,
      cause: "eligible_pair",
    });
  });
});
