import { describe, expect, it } from "vitest";
import { CraftingService } from "../../crafting/CraftingService";
import { STARTER_CRAFTING_RECIPES } from "../../crafting/StarterRecipes";
import { STARTER_PROCESSING_STATIONS } from "../../crafting/ProcessingStations";
import {
  createCraftingReceipt,
  type CraftingReceiptPersistenceAdapter,
  type PersistedCraftingReceipt,
} from "../../crafting/CraftingReceiptPersistence";
import type { CraftingRecipe } from "../../crafting/CraftingTypes";
import { InventoryService } from "../../inventory/InventoryService";
import { InventoryStore } from "../../inventory/InventoryStore";
import type {
  InventoryPersistenceAdapter,
  PersistedPlayerInventoryState,
} from "../../inventory/InventoryPersistence";
import {
  applySkillXp,
  createDefaultPlayerSkillState,
  type PlayerSkillState,
} from "../../skills/SkillTypes";

class MemoryInventoryPersistence implements InventoryPersistenceAdapter {
  private state: PersistedPlayerInventoryState | null = null;
  public failNextOutputSave = false;

  public async loadPlayerInventory(): Promise<PersistedPlayerInventoryState | null> {
    return this.state;
  }

  public async savePlayerInventory(state: PersistedPlayerInventoryState): Promise<void> {
    if (this.failNextOutputSave && state.slots.some((slot) => slot.itemId === "wood_plank")) {
      this.failNextOutputSave = false;
      throw new Error("simulated_output_persistence_failure");
    }
    this.state = structuredClone(state);
  }
}

class MemorySkillRuntime {
  private states = new Map<string, PlayerSkillState>();
  public applyCount = 0;

  public async hydratePlayer(playerId: string): Promise<void> {
    if (!this.states.has(playerId)) this.states.set(playerId, createDefaultPlayerSkillState(playerId));
  }

  public async getPlayerSkillState(playerId: string): Promise<PlayerSkillState> {
    await this.hydratePlayer(playerId);
    return structuredClone(this.states.get(playerId)!);
  }

  public async applyEvent(event: { playerId: string; amount: number }): Promise<void> {
    const current = await this.getPlayerSkillState(event.playerId);
    this.states.set(event.playerId, {
      ...current,
      skills: current.skills.map((skill) => skill.id === "crafting"
        ? applySkillXp(skill, event.amount)
        : skill),
    });
    this.applyCount += 1;
  }

  public async restorePlayerSkillState(playerId: string, state: PlayerSkillState): Promise<void> {
    this.states.set(playerId, structuredClone(state));
  }
}

class MemoryCraftingReceiptPersistence implements CraftingReceiptPersistenceAdapter {
  private readonly receipts = new Map<string, PersistedCraftingReceipt>();

  public async loadReceipt(operationId: string): Promise<PersistedCraftingReceipt | null> {
    const receipt = this.receipts.get(operationId);
    return receipt ? structuredClone(receipt) : null;
  }

  public async saveReceipt(receipt: PersistedCraftingReceipt): Promise<void> {
    this.receipts.set(receipt.operationId, structuredClone(receipt));
  }

  public async deleteReceipt(operationId: string): Promise<void> {
    this.receipts.delete(operationId);
  }
}

function workbenchPosition(): { x: number; y: number; id: string } {
  const station = STARTER_PROCESSING_STATIONS.find((entry) => entry.type === "workbench");
  if (!station) throw new Error("workbench_missing");
  return { x: station.position.x, y: station.position.y, id: station.id };
}

function stableHash32(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16);
}

function expectedCraftHash(operationId: string, recipe: CraftingRecipe): string {
  const ingredients = [...recipe.ingredients].map((entry) => `${entry.itemId}:${entry.quantity}`).sort().join(",");
  const outputs = [...recipe.outputs].map((entry) => `${entry.itemId}:${entry.quantity}`).sort().join(",");
  const fingerprint = `${recipe.id}|${recipe.requiredLevel}|${recipe.craftTicks}|${recipe.stationType ?? "none"}|${ingredients}|${outputs}`;
  return stableHash32(["CRAFT_DELTA_V2", operationId, fingerprint].join("|"));
}

async function setup() {
  const playerId = "craft-transaction-player";
  const persistence = new MemoryInventoryPersistence();
  const inventory = new InventoryService(new InventoryStore(), persistence);
  const skills = new MemorySkillRuntime();
  const receipts = new MemoryCraftingReceiptPersistence();
  await inventory.addItem({ playerId, itemId: "wood_log", quantity: 4 });
  const service = new CraftingService(STARTER_CRAFTING_RECIPES, {
    inventoryService: inventory,
    skillService: skills,
    receiptPersistence: receipts,
  });
  return { playerId, persistence, inventory, skills, receipts, service };
}

describe("Crafting transaction truth", () => {
  it("rejects a mutation without tick and operation evidence", async () => {
    const { playerId, inventory, service } = await setup();
    const station = workbenchPosition();
    const before = await inventory.getPlayerInventory(playerId);
    const result = await service.craft({ playerId, recipeId: "craft_wood_plank", playerPosition: station, stationId: station.id });
    expect(result).toEqual(expect.objectContaining({ ok: false, reason: "invalid_tick" }));
    expect(await inventory.getPlayerInventory(playerId)).toEqual(before);
  });

  it("replays the same operation only when receipt, inventory origins and XP agree", async () => {
    const { playerId, inventory, skills, service } = await setup();
    const station = workbenchPosition();
    const input = { playerId, recipeId: "craft_wood_plank", playerPosition: station, stationId: station.id, currentTick: 120, operationId: "intent:craft:truth:120" };
    const first = await service.craft(input);
    const afterFirst = await inventory.getPlayerInventory(playerId);
    const second = await service.craft(input);
    expect(first).toEqual(expect.objectContaining({ ok: true, replayed: false, receiptHash: expect.stringMatching(/^[a-f0-9]{64}$/) }));
    expect(second).toEqual(expect.objectContaining({ ok: true, replayed: true, receiptHash: first.receiptHash }));
    expect(await inventory.getPlayerInventory(playerId)).toEqual(afterFirst);
    expect(skills.applyCount).toBe(1);
  });

  it("restores an interrupted prepared receipt before retrying the operation", async () => {
    const { playerId, inventory, skills, receipts, service } = await setup();
    const station = workbenchPosition();
    const operationId = "intent:craft:prepared-recovery:122";
    const inventoryBefore = await inventory.getPlayerInventory(playerId);
    const skillsBefore = await skills.getPlayerSkillState(playerId);
    const recipe = STARTER_CRAFTING_RECIPES.find((entry) => entry.id === "craft_wood_plank")!;
    const originUids = [`craft:${operationId}:output:0`];

    await receipts.saveReceipt(createCraftingReceipt({
      operationId,
      playerId,
      recipeId: recipe.id,
      craftHash: expectedCraftHash(operationId, recipe),
      originUids,
      status: "prepared",
      inventoryBefore,
      appliedOriginUidsBefore: inventory.getAppliedOriginUids(playerId),
      movementEventCountBefore: inventory.getMovementEventCount(),
      skillsBefore,
      expectedCraftingXpAfter: recipe.craftingXpReward,
    }));

    const result = await service.craft({
      playerId,
      recipeId: recipe.id,
      playerPosition: station,
      stationId: station.id,
      currentTick: 122,
      operationId,
    });

    expect(result).toEqual(expect.objectContaining({ ok: true, replayed: false }));
    expect((await inventory.getPlayerInventory(playerId)).slots).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: "wood_plank", quantity: 1 }),
    ]));
    expect(skills.applyCount).toBe(1);
  });

  it("restores inventory, origins and skill state after output persistence fails", async () => {
    const { playerId, persistence, inventory, skills, service } = await setup();
    const station = workbenchPosition();
    const inventoryBefore = await inventory.getPlayerInventory(playerId);
    const skillsBefore = await skills.getPlayerSkillState(playerId);
    persistence.failNextOutputSave = true;
    const result = await service.craft({ playerId, recipeId: "craft_wood_plank", playerPosition: station, stationId: station.id, currentTick: 121, operationId: "intent:craft:rollback:121" });
    expect(result).toEqual(expect.objectContaining({ ok: false, rollbackOk: true }));
    expect(await inventory.getPlayerInventory(playerId)).toEqual(inventoryBefore);
    expect(await skills.getPlayerSkillState(playerId)).toEqual(skillsBefore);
    expect(inventory.getAppliedOriginUids(playerId)).toEqual([]);
  });
});
