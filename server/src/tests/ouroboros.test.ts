import { describe, it, expect } from "vitest";
import { WorldEventBus } from "../modules/ouroboros/WorldEventBus";
import { WorldHistory } from "../modules/ouroboros/WorldHistory";
import { EmergentMarket } from "../modules/ouroboros/EmergentMarket";
import { DynamicFactions } from "../modules/ouroboros/DynamicFactions";
import { OuroborosEngine } from "../modules/ouroboros/OuroborosEngine";
import { decayNeeds, mostUrgentNeed, defaultNeeds, restoreNeed, needToGoalCategory } from "../modules/ouroboros/AgentNeeds";
import { NPCMemoryCache } from "../modules/npc/NPCMemoryCache";

describe("WorldEventBus", () => {
  it("emits and receives typed events", () => {
    const bus = new WorldEventBus();
    const received: string[] = [];
    bus.on("combat_kill", (e) => received.push(e.actorName));
    bus.emit({
      type: "combat_kill",
      actorId: "npc_1",
      actorName: "Guard",
      position: { x: 0, y: 0 },
      data: {},
      intensity: 0.8,
      targetId: "mob_1",
      targetName: "Wolf",
    });
    expect(received).toEqual(["Guard"]);
  });

  it("onAll receives all event types", () => {
    const bus = new WorldEventBus();
    const types: string[] = [];
    bus.onAll((e) => types.push(e.type));
    bus.emit({ type: "trade_complete", actorId: "a", actorName: "A", position: { x: 0, y: 0 }, data: {}, intensity: 0.3 });
    bus.emit({ type: "combat_kill", actorId: "b", actorName: "B", position: { x: 0, y: 0 }, data: {}, intensity: 0.7 });
    expect(types).toEqual(["trade_complete", "combat_kill"]);
  });

  it("unsubscribe works", () => {
    const bus = new WorldEventBus();
    let count = 0;
    const unsub = bus.on("level_up", () => count++);
    bus.emit({ type: "level_up", actorId: "a", actorName: "A", position: { x: 0, y: 0 }, data: {}, intensity: 0.3 });
    unsub();
    bus.emit({ type: "level_up", actorId: "a", actorName: "A", position: { x: 0, y: 0 }, data: {}, intensity: 0.3 });
    expect(count).toBe(1);
  });
});

describe("WorldHistory", () => {
  it("records events and generates history entries", () => {
    const history = new WorldHistory();
    const bus = new WorldEventBus();
    bus.onAll((e) => history.record(e));

    const event = bus.emit({
      type: "combat_kill",
      actorId: "hero",
      actorName: "Aragorn",
      position: { x: 10, y: 20 },
      data: {},
      intensity: 0.95,
      targetId: "dragon",
      targetName: "Smaug",
    });

    expect(history.getEntryCount()).toBe(1);
    const recent = history.getRecent();
    expect(recent[0].actorName).toBe("Aragorn");
    expect(recent[0].summary).toContain("Aragorn");
  });

  it("creates legends for high-impact events", () => {
    const history = new WorldHistory();
    const bus = new WorldEventBus();
    bus.onAll((e) => history.record(e));

    bus.emit({
      type: "war_declared",
      actorId: "faction_a",
      actorName: "Nordreich",
      position: { x: 0, y: 0 },
      data: {},
      intensity: 0.95,
      targetId: "faction_b",
      targetName: "Südreich",
    });

    expect(history.getLegendCount()).toBeGreaterThanOrEqual(1);
    const legends = history.getLegends();
    expect(legends[0].title).toContain("Nordreich");
  });

  it("spreads legends between agents (oral tradition)", () => {
    const history = new WorldHistory();
    const bus = new WorldEventBus();
    bus.onAll((e) => history.record(e));

    bus.emit({
      type: "agent_died",
      actorId: "hero",
      actorName: "Legendary Hero",
      position: { x: 0, y: 0 },
      data: {},
      intensity: 0.99,
    });

    const legend = history.getLegends()[0];
    legend.knownBy.add("agent_a");

    const spread = history.spreadLegend(legend.id, "agent_a", "agent_b");
    expect(spread).not.toBeNull();
    expect(legend.knownBy.has("agent_b")).toBe(true);
    expect(legend.retellCount).toBe(1);
  });
});

describe("EmergentMarket", () => {
  it("calculates prices based on supply/demand", () => {
    const market = new EmergentMarket();
    const p1 = market.getPrice("region_a", "iron");
    market.addDemand("region_a", "iron", 20);
    const p2 = market.getPrice("region_a", "iron");
    expect(p2).toBeGreaterThan(p1);
  });

  it("buy reduces supply and increases demand", () => {
    const market = new EmergentMarket();
    market.addSupply("region_a", "wood", 50);
    const cost = market.buy("region_a", "wood", 5);
    expect(cost).toBeGreaterThan(0);
    const entry = market.getEntry("region_a", "wood");
    expect(entry.supply).toBe(55);
  });

  it("sell increases supply", () => {
    const market = new EmergentMarket();
    const revenue = market.sell("region_a", "herbs", 10);
    expect(revenue).toBeGreaterThan(0);
    expect(market.getEntry("region_a", "herbs").supply).toBe(20);
  });

  it("trade routes emerge from repeated trips", () => {
    const market = new EmergentMarket();
    for (let i = 0; i < 5; i++) {
      market.recordRoute("region_a", "region_b", "silk", 15);
    }
    const routes = market.getEstablishedRoutes();
    expect(routes.length).toBe(1);
    expect(routes[0].tripCount).toBe(5);
  });
});

describe("DynamicFactions", () => {
  it("forms factions from agent groups", () => {
    const factions = new DynamicFactions();
    const f = factions.formFaction("Guardians", "npc_1", ["npc_2", "npc_3"]);
    expect(f.members.size).toBe(3);
    expect(factions.getAgentFaction("npc_1")?.id).toBe(f.id);
  });

  it("adjusts hostility between factions", () => {
    const factions = new DynamicFactions();
    const f1 = factions.formFaction("A", "a1", ["a2", "a3"]);
    const f2 = factions.formFaction("B", "b1", ["b2", "b3"]);
    factions.adjustHostility(f1.id, f2.id, 0.5);
    expect(f1.hostility.get(f2.id)).toBe(0.5);
    expect(f2.hostility.get(f1.id)).toBe(0.5);
  });

  it("resolves conflicts (war/peace/alliance)", () => {
    const factions = new DynamicFactions();
    const f1 = factions.formFaction("A", "a1", ["a2", "a3"]);
    const f2 = factions.formFaction("B", "b1", ["b2", "b3"]);
    factions.adjustHostility(f1.id, f2.id, 0.8);
    const events = factions.resolveConflicts();
    expect(events.some((e) => e.type === "war_declared")).toBe(true);
  });

  it("forms families from high-affinity agents", () => {
    const factions = new DynamicFactions();
    const family = factions.formFamily("npc_a", "npc_b", 0.9);
    expect(family).not.toBeNull();
    expect(family!.members).toContain("npc_a");
    expect(factions.getAgentFamily("npc_a")).toBeTruthy();
  });

  it("rejects family formation below threshold", () => {
    const factions = new DynamicFactions();
    expect(factions.formFamily("a", "b", 0.3)).toBeNull();
  });
});

describe("AgentNeeds", () => {
  it("decays needs over time", () => {
    const needs = defaultNeeds();
    const before = needs.safety;
    decayNeeds(needs);
    expect(needs.safety).toBeLessThan(before);
  });

  it("identifies most urgent need", () => {
    const needs = defaultNeeds();
    needs.power = 0.01;
    expect(mostUrgentNeed(needs)).toBe("power");
  });

  it("restores needs within bounds", () => {
    const needs = defaultNeeds();
    restoreNeed(needs, "safety", 0.5);
    expect(needs.safety).toBeLessThanOrEqual(1.0);
    restoreNeed(needs, "power", -5);
    expect(needs.power).toBeGreaterThanOrEqual(0);
  });

  it("maps needs to goal categories", () => {
    expect(needToGoalCategory("safety")).toBe("seek_safety");
    expect(needToGoalCategory("wealth")).toBe("trade");
  });
});

describe("OuroborosEngine", () => {
  it("records events into history via bus", () => {
    const engine = new OuroborosEngine();
    engine.eventBus.emit({
      type: "quest_completed",
      actorId: "player_1",
      actorName: "Hero",
      position: { x: 0, y: 0 },
      data: { questName: "Dragon Slayer" },
      intensity: 0.8,
    });
    expect(engine.history.getEntryCount()).toBe(1);
  });

  it("getStats returns summary", () => {
    const engine = new OuroborosEngine();
    const stats = engine.getStats();
    expect(stats).toHaveProperty("historyEntries");
    expect(stats).toHaveProperty("legends");
    expect(stats).toHaveProperty("factions");
  });
});
