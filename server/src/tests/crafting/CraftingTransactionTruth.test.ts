import { describe, expect, it } from "vitest";
import { CraftingService } from "../../crafting/CraftingService";
import { STARTER_CRAFTING_RECIPES } from "../../crafting/StarterRecipes";
import { STARTER_PROCESSING_STATIONS } from "../../crafting/ProcessingStations";
import { InventoryService } from "../../inventory/InventoryService";
import { InventoryStore } from "../../inventory/InventoryStore";
import type {
  InventoryPersistenceAdapter,
  PersistedPlayerInventoryState,
} from "../../inventory/InventoryPersistence";
import {
  createDefaultPlayerSkillState,
  normalizePlayerSkillState,
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

  public async applyEvent(event: {
    playerId: string;
    amount: number;
  }): Promise<void> {
    const current = await this.getPlayerSkillState(event.playerId);
    const crafting = current.skills.find((skill) => skill.id === "crafting");
    if (crafting) crafting.xp += event.amount;
    this.states.set(event.playerId, normalizePlayerSkillState(current, event.playerId));
    this.applyCount += 1;
  }

  public async restorePlayerSkillState(playerId: string, state: PlayerSkillState): Promise<void> {
    this.states.set(playerId, structuredClone(state));
  }
}

function workbenchPosition(): { x: number; y: number; id: string } {
  const station = STARTER_PROCESSING_STATIONS.find((entry) => entry.type === "workbench");
  if (!station) throw new Error("workbench_missing");
  return { x: station.position.x, y: station.position.y, id: station.id };
}

async function setup() {
  const playerId = "craft-transaction-player";
  const persistence = new MemoryInventoryPersistence();
  const inventory = new InventoryService(new InventoryStore(), persistence);
  const skills = new MemorySkillRuntime();
  await inventory.addItem({ playerId, itemId: "wood_log", quantity: 4 });
  const service = new CraftingService(STARTER_CRAFTING_RECIPES, {
    inventoryService: inventory,
    skillService: skills,
  });
  return { playerId, persistence, inventory, skills, service };
}

describe("Crafting transaction truth", () => {
  it("rejects a mutation without tick and operation evidence", async () => {
    const { playerId, inventory, service } = await setup();
    const station = workbenchPosition();
    const before = await inventory.getPlayerInventory(playerId);

    const result = await service.craft({
      playerId,
      recipeId: "craft_wood_plank",
      playerPosition: station,
      stationId: station.id,
    });

    expect(result).toEqual(expect.objectContaining({ ok: false, reason: "invalid_tick" }));
    expect(await inventory.getPlayerInventory(playerId)).toEqual(before);
  });

  it("replays the same operation without consuming ingredients or granting XP twice", async () => {
    const { playerId, inventory, skills, service } = await setup();
    const station = workbenchPosition();
    const input = {
      playerId,
      recipeId: "craft_wood_plank",
      playerPosition: station,
      stationId: station.id,
      currentTick: 120,
      operationId: "intent:craft:truth:120",
    };

    const first = await service.craft(input);
    const afterFirst = await inventory.getPlayerInventory(playerId);
    const second = await service.craft(input);

    expect(first).toEqual(expect.objectContaining({ ok: true, replayed: false }));
    expect(second).toEqual(expect.objectContaining({ ok: true, replayed: true }));
    expect(await inventory.getPlayerInventory(playerId)).toEqual(afterFirst);
    expect(skills.applyCount).toBe(1);
  });

  it("restores inventory, origins and skill state after output persistence fails", async () => {
    const { playerId, persistence, inventory, skills, service } = await setup();
    const station = workbenchPosition();
    const inventoryBefore = await inventory.getPlayerInventory(playerId);
    const skillsBefore = await skills.getPlayerSkillState(playerId);
    persistence.failNextOutputSave = true;

    const result = await service.craft({
      playerId,
      recipeId: "craft_wood_plank",
      playerPosition: station,
      stationId: station.id,
      currentTick: 121,
      operationId: "intent:craft:rollback:121",
    });

    expect(result).toEqual(expect.objectContaining({ ok: false, rollbackOk: true }));
    expect(await inventory.getPlayerInventory(playerId)).toEqual(inventoryBefore);
    expect(await skills.getPlayerSkillState(playerId)).toEqual(skillsBefore);
    expect(inventory.getAppliedOriginUids(playerId)).toEqual([]);
  });
});
