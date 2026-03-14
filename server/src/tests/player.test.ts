import { describe, it, expect, beforeEach } from "vitest";
import { PlayerSystem } from "../modules/player/PlayerSystem.js";
import { EquipmentSystem } from "../modules/player/EquipmentSystem.js";
import { StaminaRegen } from "../modules/player/StaminaRegen.js";
import { TitleSystem } from "../modules/player/TitleSystem.js";
import { ReputationTitleBridge } from "../modules/player/ReputationTitleBridge.js";

// ---------------------------------------------------------------------------
// PlayerSystem
// ---------------------------------------------------------------------------
describe("PlayerSystem", () => {
  let ps: PlayerSystem;

  beforeEach(() => { ps = new PlayerSystem(); });

  it("createPlayer() returns a player with the correct id", () => {
    const player = ps.createPlayer("p1", "Alice");
    expect(player.id).toBe("p1");
  });

  it("createPlayer() returns a player with the correct name", () => {
    const player = ps.createPlayer("p1", "Alice");
    expect(player.name).toBe("Alice");
  });

  it("createPlayer() initializes health to 100", () => {
    const player = ps.createPlayer("p1", "Alice");
    expect(player.health).toBe(100);
  });

  it("createPlayer() initializes stamina to 100", () => {
    const player = ps.createPlayer("p1", "Alice");
    expect(player.stamina).toBe(100);
  });

  it("createPlayer() initializes mana to 25", () => {
    const player = ps.createPlayer("p1", "Alice");
    expect(player.mana).toBe(25);
  });

  it("createPlayer() initializes gold to 0", () => {
    const player = ps.createPlayer("p1", "Alice");
    expect(player.gold).toBe(0);
  });

  it("createPlayer() starts with empty inventory", () => {
    const player = ps.createPlayer("p1", "Alice");
    expect(player.inventory).toEqual([]);
  });

  it("createPlayer() starts with empty skills", () => {
    const player = ps.createPlayer("p1", "Alice");
    expect(player.skills).toEqual({});
  });

  it("createPlayer() starts with empty quests", () => {
    const player = ps.createPlayer("p1", "Alice");
    expect(player.quests).toEqual([]);
  });

  it("createPlayer() position defaults to origin", () => {
    const player = ps.createPlayer("p1", "Alice");
    expect(player.position).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("getPlayer() returns the player after creation", () => {
    ps.createPlayer("p1", "Alice");
    expect(ps.getPlayer("p1")).toBeDefined();
    expect(ps.getPlayer("p1").name).toBe("Alice");
  });

  it("getPlayer() returns undefined for unknown player", () => {
    expect(ps.getPlayer("nobody")).toBeUndefined();
  });

  it("getAllPlayers() returns all created players", () => {
    ps.createPlayer("p1", "Alice");
    ps.createPlayer("p2", "Bob");
    expect(ps.getAllPlayers()).toHaveLength(2);
  });

  it("getAllPlayers() returns empty array when no players exist", () => {
    expect(ps.getAllPlayers()).toHaveLength(0);
  });

  it("removePlayer() removes a player from the system", () => {
    ps.createPlayer("p1", "Alice");
    ps.removePlayer("p1");
    expect(ps.getPlayer("p1")).toBeUndefined();
  });

  it("removePlayer() on unknown id does not throw", () => {
    expect(() => ps.removePlayer("nobody")).not.toThrow();
  });

  it("setPlayer() stores an arbitrary player object", () => {
    ps.setPlayer("p99", { id: "p99", name: "Custom" });
    expect(ps.getPlayer("p99").name).toBe("Custom");
  });
});

// ---------------------------------------------------------------------------
// EquipmentSystem
// ---------------------------------------------------------------------------
describe("EquipmentSystem", () => {
  let equipment: EquipmentSystem;

  beforeEach(() => { equipment = new EquipmentSystem(); });

  it("equip() places an item in the given slot", () => {
    const player: any = { equipment: {} };
    equipment.equip(player, "weapon", { id: "iron_sword" });
    expect(player.equipment.weapon).toEqual({ id: "iron_sword" });
  });

  it("equip() returns the updated equipment object", () => {
    const player: any = { equipment: {} };
    const result = equipment.equip(player, "armor", { id: "leather_armor" });
    expect(result).toBe(player.equipment);
  });

  it("equip() creates equipment object if player has none", () => {
    const player: any = {};
    equipment.equip(player, "weapon", { id: "dagger" });
    expect(player.equipment.weapon).toEqual({ id: "dagger" });
  });

  it("equip() overwrites a previously equipped item in the same slot", () => {
    const player: any = { equipment: { weapon: { id: "old_sword" } } };
    equipment.equip(player, "weapon", { id: "new_axe" });
    expect(player.equipment.weapon.id).toBe("new_axe");
  });

  it("unequip() removes an item from a slot and returns it", () => {
    const player: any = { equipment: { weapon: { id: "iron_sword" } } };
    const item = equipment.unequip(player, "weapon");
    expect(item).toEqual({ id: "iron_sword" });
    expect(player.equipment.weapon).toBeUndefined();
  });

  it("unequip() returns null when the slot is empty", () => {
    const player: any = { equipment: {} };
    expect(equipment.unequip(player, "weapon")).toBeNull();
  });

  it("unequip() creates equipment object if missing", () => {
    const player: any = {};
    const result = equipment.unequip(player, "armor");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// StaminaRegen
// ---------------------------------------------------------------------------
describe("StaminaRegen", () => {
  let regen: StaminaRegen;

  beforeEach(() => { regen = new StaminaRegen(); });

  it("tick() increments stamina by 1", () => {
    const player: any = { stamina: 50 };
    regen.tick(player);
    expect(player.stamina).toBe(51);
  });

  it("tick() returns the new stamina value", () => {
    const player: any = { stamina: 50 };
    expect(regen.tick(player)).toBe(51);
  });

  it("tick() does not exceed 100", () => {
    const player: any = { stamina: 100 };
    regen.tick(player);
    expect(player.stamina).toBe(100);
  });

  it("tick() caps at 100 when stamina is 99", () => {
    const player: any = { stamina: 99 };
    regen.tick(player);
    expect(player.stamina).toBe(100);
  });

  it("tick() treats undefined stamina as 0", () => {
    const player: any = {};
    regen.tick(player);
    expect(player.stamina).toBe(1);
  });

  it("multiple ticks accumulate correctly", () => {
    const player: any = { stamina: 0 };
    for (let i = 0; i < 5; i++) regen.tick(player);
    expect(player.stamina).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// TitleSystem
// ---------------------------------------------------------------------------
describe("TitleSystem", () => {
  let titles: TitleSystem;

  beforeEach(() => { titles = new TitleSystem(); });

  it("assign() returns the assigned title", () => {
    const player: any = {};
    expect(titles.assign(player, "Warrior")).toBe("Warrior");
  });

  it("assign() adds the title to player.titles", () => {
    const player: any = {};
    titles.assign(player, "Warrior");
    expect(player.titles).toContain("Warrior");
  });

  it("assign() initializes titles array if missing", () => {
    const player: any = {};
    titles.assign(player, "Explorer");
    expect(Array.isArray(player.titles)).toBe(true);
  });

  it("assign() appends to an existing titles array", () => {
    const player: any = { titles: ["Novice"] };
    titles.assign(player, "Adept");
    expect(player.titles).toEqual(["Novice", "Adept"]);
  });

  it("a player can hold multiple titles", () => {
    const player: any = {};
    titles.assign(player, "Hero");
    titles.assign(player, "Champion");
    titles.assign(player, "Legend");
    expect(player.titles).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// ReputationTitleBridge
// ---------------------------------------------------------------------------
describe("ReputationTitleBridge", () => {
  let bridge: ReputationTitleBridge;

  beforeEach(() => { bridge = new ReputationTitleBridge(); });

  it("score >= 1000 yields 'Renowned'", () => {
    expect(bridge.resolveTitle(1000)).toBe("Renowned");
  });

  it("score > 1000 still yields 'Renowned'", () => {
    expect(bridge.resolveTitle(5000)).toBe("Renowned");
  });

  it("score 999 yields 'Honored'", () => {
    expect(bridge.resolveTitle(999)).toBe("Honored");
  });

  it("score exactly 500 yields 'Honored'", () => {
    expect(bridge.resolveTitle(500)).toBe("Honored");
  });

  it("score 499 yields 'Known'", () => {
    expect(bridge.resolveTitle(499)).toBe("Known");
  });

  it("score exactly 100 yields 'Known'", () => {
    expect(bridge.resolveTitle(100)).toBe("Known");
  });

  it("score 99 yields 'Unknown'", () => {
    expect(bridge.resolveTitle(99)).toBe("Unknown");
  });

  it("score 0 yields 'Unknown'", () => {
    expect(bridge.resolveTitle(0)).toBe("Unknown");
  });

  it("negative score yields 'Unknown'", () => {
    expect(bridge.resolveTitle(-500)).toBe("Unknown");
  });
});
