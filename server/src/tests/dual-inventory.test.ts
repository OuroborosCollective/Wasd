import { describe, it, expect } from "vitest";
import {
  addGearToPlayer,
  ensureDualInventoryFields,
  getPlayerInventoryView,
} from "../modules/items/dualInventoryTypes.js";
import { scaleRoll } from "../modules/loot/rollScale.js";
import { pityBonus } from "../modules/loot/pity.js";
import { spawnLootBag, lootBagToRuntimeBag } from "../modules/loot/lootBag.js";
import { InventorySystem } from "../modules/inventory/InventorySystem.js";
import { ItemRegistry } from "../modules/inventory/ItemRegistry.js";

describe("dual inventory + loot helpers", () => {
  ItemRegistry.init();
  it("ensureDualInventoryFields initializes arrays", () => {
    const p: any = { inventory: [], gold: 0 };
    ensureDualInventoryFields(p);
    expect(Array.isArray(p.gearInventory)).toBe(true);
    expect(p.lootPity.killsSinceLegendary).toBe(0);
  });

  it("addGearToPlayer dedupes uid", () => {
    const p: any = { inventory: [], gearInventory: [] };
    addGearToPlayer(p, {
      uid: "u1",
      baseId: "rusted_blade",
      name: "S",
      rarity: "rare",
      ilvl: 5,
      stats: { str: 2 },
    });
    addGearToPlayer(p, {
      uid: "u1",
      baseId: "rusted_blade",
      name: "S",
      rarity: "rare",
      ilvl: 5,
      stats: {},
    });
    expect(p.gearInventory.length).toBe(1);
  });

  it("getPlayerInventoryView merges stack + gear", () => {
    const p: any = {
      gold: 10,
      inventory: [{ id: "cloth", quantity: 3 }],
      gearInventory: [{ uid: "g", baseId: "rusted_blade", name: "X", rarity: "magic", ilvl: 1, stats: {} }],
    };
    const v = getPlayerInventoryView(p);
    expect(v.stack[0]).toEqual({ id: "cloth", quantity: 3 });
    expect(v.gear.length).toBe(1);
    expect(v.gold).toBe(10);
  });

  it("InventorySystem weight includes gear baseId", () => {
    const inv = new InventorySystem();
    const p: any = {
      inventory: [],
      gearInventory: [{ uid: "a", baseId: "rusted_blade", name: "S", rarity: "common", ilvl: 1, stats: {} }],
    };
    const w = inv.calculateWeight(p);
    expect(w).toBeGreaterThan(0);
  });

  it("scaleRoll increases range with ilvl", () => {
    const a = scaleRoll(10, 20, 1);
    const b = scaleRoll(10, 20, 100);
    expect(b.max).toBeGreaterThanOrEqual(a.max);
  });

  it("pityBonus caps", () => {
    expect(pityBonus(1000)).toBe(0.08);
  });

  it("spawnLootBag + lootBagToRuntimeBag", () => {
    const bag = spawnLootBag({
      x: 1,
      y: 2,
      gold: 5,
      stack: [{ id: "gem", quantity: 1 }],
      gear: [],
      ttlMs: 60_000,
    });
    const rt = lootBagToRuntimeBag(bag, 30_000);
    expect(rt.items[0].id).toBe("gem");
    expect(rt.position.x).toBe(1);
  });
});
