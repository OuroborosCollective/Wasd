import { describe, expect, it } from "vitest";
import { GatheringService } from "../../resources/GatheringService";
import { ResourceNodeStore } from "../../resources/ResourceNodeStore";
import { ResourceEcologyService } from "../../resources/ResourceEcologyService";
import type { ResourceNodeDefinition } from "../../resources/ResourceTypes";
import { InventoryService } from "../../inventory/InventoryService";
import { InventoryStore } from "../../inventory/InventoryStore";
import {
  createPersistedPlayerInventoryState,
  type InventoryPersistenceAdapter,
  type PersistedPlayerInventoryState,
} from "../../inventory/InventoryPersistence";
import { SkillProgressionService } from "../../skills/SkillProgressionService";
import { SkillProgressionStore } from "../../skills/SkillProgressionStore";
import type { PersistedPlayerSkillState, SkillPersistenceAdapter } from "../../skills/SkillPersistence";

const NODE: ResourceNodeDefinition = {
  id: "atomic_tree_001",
  kind: "tree",
  title: "Atomic Tree",
  skillId: "woodcutting",
  requiredLevel: 1,
  xpReward: 10,
  itemRewardId: "wood_log",
  itemRewardName: "Wood Log",
  respawnTicks: 100,
  position: { x: 10, y: 5 },
  radius: 8,
};

class FailOnceInventoryPersistence implements InventoryPersistenceAdapter {
  private readonly states = new Map<string, PersistedPlayerInventoryState>();
  failNextSave = false;

  async loadPlayerInventory(playerId: string): Promise<PersistedPlayerInventoryState | null> {
    const state = this.states.get(playerId);
    return state
      ? createPersistedPlayerInventoryState(state.playerId, state, state.appliedOriginUids)
      : null;
  }

  async savePlayerInventory(state: PersistedPlayerInventoryState): Promise<void> {
    if (this.failNextSave) {
      this.failNextSave = false;
      throw new Error("inventory_save_failed");
    }
    this.states.set(
      state.playerId,
      createPersistedPlayerInventoryState(state.playerId, state, state.appliedOriginUids),
    );
  }
}

class MemorySkillPersistence implements SkillPersistenceAdapter {
  private readonly states = new Map<string, PersistedPlayerSkillState>();

  async loadPlayerSkillState(playerId: string): Promise<PersistedPlayerSkillState | null> {
    const state = this.states.get(playerId);
    return state
      ? { ...state, skills: state.skills.map((skill) => ({ ...skill })) }
      : null;
  }

  async savePlayerSkillState(state: PersistedPlayerSkillState): Promise<void> {
    this.states.set(state.playerId, {
      ...state,
      skills: state.skills.map((skill) => ({ ...skill })),
    });
  }
}

function createRuntime() {
  const inventoryPersistence = new FailOnceInventoryPersistence();
  const inventoryStore = new InventoryStore();
  const inventory = new InventoryService(inventoryStore, inventoryPersistence);
  const skills = new SkillProgressionService(
    new SkillProgressionStore(),
    new MemorySkillPersistence(),
  );
  const nodes = new ResourceNodeStore(
    [NODE],
    "atomic-test-world",
    {
      schemaVersion: 1,
      id: "atomic-test-momentum",
      enabled: true,
      truthStatus: "runtime_truth",
      canBecomeTruth: true,
      truthPath: "test",
      truthPromotion: "test",
      appliesToSkillIds: ["woodcutting"],
      windowTicks: 20,
      streakBonusPermille: 100,
      maxStreak: 3,
      resetOnSkillChange: true,
    },
  );
  const ecology = new ResourceEcologyService({
    schemaVersion: 1,
    tickCadence: 1,
    kindRules: [
      {
        kind: "tree",
        capacity: 1000,
        initialStock: 1000,
        regenPerTick: 0,
        extractionUnits: 100,
        extractionPressurePermille: 100,
        pressureDecayPermillePerTick: 0,
        collapseThreshold: 100,
        collapseRegenPermille: 500,
      },
    ],
    nodeOverrides: [],
  });
  ecology.registerNode(NODE);

  const gathering = new GatheringService(nodes, ecology, {
    getSkillService: async () => skills,
    getInventoryService: async () => inventory,
    equipment: {
      getPlayerEquipment: async (playerId: string) => ({
        playerId,
        schemaVersion: 1 as const,
        slots: [],
      }),
    },
  });

  return {
    ecology,
    gathering,
    inventory,
    inventoryPersistence,
    inventoryStore,
    nodes,
    skills,
  };
}

describe("Gathering atomicity", () => {
  it("restores node, momentum, ecology, XP, inventory, origins, and movement evidence after persistence failure", async () => {
    const runtime = createRuntime();
    const playerId = "atomic-gatherer";
    const tick = 50;
    const skillBefore = await runtime.skills.getPlayerSkillState(playerId);
    const ecologyBefore = runtime.ecology.getNodeSnapshot(NODE.id, tick);
    runtime.inventoryPersistence.failNextSave = true;

    const result = await runtime.gathering.gather({
      playerId,
      nodeId: NODE.id,
      playerPosition: NODE.position,
      currentTick: tick,
      inventoryOrigin: {
        uid: "gather:atomic:50",
        tick,
        source: "gather_delta",
        sourceHash: "atomic-hash-50",
      },
    });

    expect(result).toEqual(expect.objectContaining({
      ok: false,
      reason: "transaction_failed",
      inventoryAdded: false,
    }));
    expect(runtime.nodes.getSnapshot(NODE.id, tick)).toEqual(
      expect.objectContaining({ status: "available", depletedUntilTick: null }),
    );
    expect(runtime.ecology.getNodeSnapshot(NODE.id, tick)).toEqual(ecologyBefore);
    expect(await runtime.skills.getPlayerSkillState(playerId)).toEqual(skillBefore);
    expect((await runtime.inventory.getPlayerInventory(playerId)).slots).toEqual([]);
    expect(runtime.inventory.getAppliedOriginUids(playerId)).toEqual([]);
    expect(runtime.inventoryStore.getMovementEventCount()).toBe(0);
  });

  it("serializes simultaneous gathers so only one request commits the node", async () => {
    const runtime = createRuntime();
    const input = {
      nodeId: NODE.id,
      playerPosition: NODE.position,
      currentTick: 60,
    };

    const [first, second] = await Promise.all([
      runtime.gathering.gather({
        ...input,
        playerId: "gatherer-a",
        inventoryOrigin: {
          uid: "gather:a:60",
          tick: 60,
          source: "gather_delta" as const,
          sourceHash: "hash-a-60",
        },
      }),
      runtime.gathering.gather({
        ...input,
        playerId: "gatherer-b",
        inventoryOrigin: {
          uid: "gather:b:60",
          tick: 60,
          source: "gather_delta" as const,
          sourceHash: "hash-b-60",
        },
      }),
    ]);

    expect([first.ok, second.ok].filter(Boolean)).toHaveLength(1);
    expect([first.reason, second.reason]).toContain("node_depleted");
    const totalWood = ["gatherer-a", "gatherer-b"]
      .map(async (playerId) => (await runtime.inventory.getPlayerInventory(playerId)).slots
        .find((slot) => slot.itemId === "wood_log")?.quantity ?? 0);
    expect((await Promise.all(totalWood)).reduce((sum, quantity) => sum + quantity, 0)).toBe(1);
  });
});
