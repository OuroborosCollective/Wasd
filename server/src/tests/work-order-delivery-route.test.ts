import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import express, { type Router } from "express";
import request from "supertest";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { InventoryService } from "../inventory/InventoryService.js";
import type { InventoryStore } from "../inventory/InventoryStore.js";
import type { SkillProgressionStore } from "../skills/SkillProgressionStore.js";
import type { WalletStore } from "../economy/WalletStore.js";
import type { WorkOrderService } from "../economy/WorkOrderService.js";

let economyRouter: Router;
let getInventoryService: () => Promise<InventoryService>;
let getInventoryStore: () => InventoryStore;
let getSkillProgressionStore: () => SkillProgressionStore;
let walletStore: WalletStore;
let workOrderService: WorkOrderService;

const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "areloria-work-orders-"));

function createApp() {
  const app = express();
  app.use("/api/economy", economyRouter);
  return app;
}

async function readPlayerWoodPlanks(playerId: string): Promise<number> {
  const inventory = await (await getInventoryService()).getPlayerInventory(playerId);
  return inventory.slots.find((slot) => slot.itemId === "wood_plank")?.quantity ?? 0;
}

beforeAll(async () => {
  process.env.INVENTORY_STATE_FILE = path.join(stateDir, "inventory-state.json");
  process.env.WALLET_STATE_FILE = path.join(stateDir, "wallet-state.json");
  process.env.SKILL_STATE_FILE = path.join(stateDir, "skill-state.json");

  const economyRouteModule = await import("../economy/economyRoute.js");
  const inventoryRuntime = await import("../inventory/inventoryRuntime.js");
  const economyRuntime = await import("../economy/economyRuntime.js");
  const skillRuntime = await import("../skills/skillRuntime.js");
  const workOrderRuntime = await import("../economy/WorkOrderService.js");

  economyRouter = economyRouteModule.default;
  getInventoryService = inventoryRuntime.getInventoryService;
  getInventoryStore = inventoryRuntime.getInventoryStore;
  getSkillProgressionStore = skillRuntime.getSkillProgressionStore;
  walletStore = economyRuntime.walletStore;
  workOrderService = workOrderRuntime.workOrderService;
});

beforeEach(async () => {
  getInventoryStore().clearForTests();
  walletStore.clearForTests();
  getSkillProgressionStore().clearForTests();
  workOrderService.clearForTests();
  await (await getInventoryService()).clearForTests();
});

afterEach(() => {
  getInventoryStore().clearForTests();
  walletStore.clearForTests();
  getSkillProgressionStore().clearForTests();
  workOrderService.clearForTests();
});

describe("work order delivery route", () => {
  it("lists work orders with deterministic snapshots", async () => {
    const response = await request(createApp()).get("/api/economy/work-orders");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.workOrders.map((order: { workOrderId: string }) => order.workOrderId)).toEqual([
      "outpost_copper_order",
      "outpost_fish_order",
      "outpost_wood_order",
    ]);
    expect(response.body.workOrders.find((order: { workOrderId: string }) => order.workOrderId === "outpost_wood_order").snapshotHash).toMatch(/^[0-9a-f]+$/);
    expect(response.body.tickContext.tickIndex).toBeGreaterThanOrEqual(0);
  });

  it("delivers inventory items, completes the work order, and applies rewards", async () => {
    const playerId = "route_work_order_player";
    const inventoryService = await getInventoryService();
    await inventoryService.addItem({ playerId, itemId: "wood_plank", quantity: 50 });

    const response = await request(createApp())
      .post("/api/economy/work-orders/deliver")
      .set("x-player-id", playerId)
      .send({ workOrderId: "outpost_wood_order", quantity: 50 });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.result.completed).toBe(true);
    expect(response.body.result.rewardApplied).toBe(true);
    expect(response.body.snapshot.completed).toBe(true);
    expect(response.body.snapshot.deliveredCount).toBe(50);
    expect(response.body.result.contributionHash).toMatch(/^[0-9a-f]+$/);

    expect(await readPlayerWoodPlanks(playerId)).toBe(0);
    expect(walletStore.getWallet(playerId).balances.coin).toBe(250);
    expect(getSkillProgressionStore().getPlayerSkillState(playerId).skills.find((skill) => skill.id === "crafting")?.xp).toBe(150);
  });

  it("rejects missing inventory without mutating work-order progress", async () => {
    const playerId = "route_work_order_empty";

    const response = await request(createApp())
      .post("/api/economy/work-orders/deliver")
      .set("x-player-id", playerId)
      .send({ workOrderId: "outpost_wood_order", quantity: 1 });

    expect(response.status).toBe(409);
    expect(response.body.ok).toBe(false);
    expect(response.body.result.reason).toBe("missing_items");
    expect(response.body.snapshot.deliveredCount).toBe(0);
    expect(walletStore.getWallet(playerId).balances.coin).toBe(0);
  });

  it("validates work-order delivery input before runtime mutation", async () => {
    const response = await request(createApp())
      .post("/api/economy/work-orders/deliver")
      .set("x-player-id", "route_validation_player")
      .send({ workOrderId: "../bad", quantity: 1 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("invalid_work_order_id");
  });
});
