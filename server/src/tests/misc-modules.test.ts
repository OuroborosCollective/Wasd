import { describe, it, expect, beforeEach } from "vitest";
import { ReligionSystem } from "../modules/religion/ReligionSystem.js";
import { SiegeEngine } from "../modules/siege/SiegeEngine.js";
import { ProphecyGenerator } from "../modules/oracle/ProphecyGenerator.js";
import { WarForecast } from "../modules/oracle/WarForecast.js";
import { TelemetryCollector } from "../modules/analytics/TelemetryCollector.js";
import { PerformanceBudget } from "../modules/analytics/PerformanceBudget.js";
import { HousingSystem } from "../modules/housing/HousingSystem.js";
import { OwnershipRegistry } from "../modules/housing/OwnershipRegistry.js";
import { DungeonGenerator } from "../modules/dungeon/DungeonGenerator.js";
import { PacketRouter } from "../networking/PacketRouter.js";
import { GameConfig } from "../config/GameConfig.js";
import { FeatureFlags } from "../config/FeatureFlags.js";
import { NPCSpawnTable } from "../modules/npc/NPCSpawnTable.js";
import { NPCProfessions } from "../modules/npc/NPCProfessions.js";

// ---------------------------------------------------------------------------
// ReligionSystem
// ---------------------------------------------------------------------------
describe("ReligionSystem", () => {
  let religion: ReligionSystem;

  beforeEach(() => { religion = new ReligionSystem(); });

  it("getReligion() returns undefined for unregistered id", () => {
    expect(religion.getReligion("sun_cult")).toBeUndefined();
  });

  it("registerReligion() stores the religion data", () => {
    religion.registerReligion("sun_cult", { deity: "Sol", followers: 0 });
    const data = religion.getReligion("sun_cult");
    expect(data).toMatchObject({ deity: "Sol" });
  });

  it("multiple religions can be registered independently", () => {
    religion.registerReligion("fire", { deity: "Ignis" });
    religion.registerReligion("water", { deity: "Aqua" });
    expect(religion.getReligion("fire").deity).toBe("Ignis");
    expect(religion.getReligion("water").deity).toBe("Aqua");
  });

  it("registerReligion() overwrites an existing religion", () => {
    religion.registerReligion("wind", { deity: "Old" });
    religion.registerReligion("wind", { deity: "New" });
    expect(religion.getReligion("wind").deity).toBe("New");
  });
});

// ---------------------------------------------------------------------------
// SiegeEngine
// ---------------------------------------------------------------------------
describe("SiegeEngine", () => {
  let engine: SiegeEngine;

  beforeEach(() => { engine = new SiegeEngine(); });

  it("start() returns type 'siege_started'", () => {
    const result = engine.start({ id: "kingdom_a" }, { id: "castle_b" });
    expect(result.type).toBe("siege_started");
  });

  it("start() captures attacker id", () => {
    const result = engine.start({ id: "attackerX" }, { id: "fort" });
    expect(result.attacker).toBe("attackerX");
  });

  it("start() captures target id", () => {
    const result = engine.start({ id: "attacker" }, { id: "targetY" });
    expect(result.target).toBe("targetY");
  });

  it("start() includes startedAt timestamp", () => {
    const before = Date.now();
    const result = engine.start({ id: "a" }, { id: "b" });
    const after = Date.now();
    expect(result.startedAt).toBeGreaterThanOrEqual(before);
    expect(result.startedAt).toBeLessThanOrEqual(after);
  });
});

// ---------------------------------------------------------------------------
// ProphecyGenerator
// ---------------------------------------------------------------------------
describe("ProphecyGenerator", () => {
  let generator: ProphecyGenerator;

  beforeEach(() => { generator = new ProphecyGenerator(); });

  it("generate() returns type 'prophecy'", () => {
    expect(generator.generate("storm").type).toBe("prophecy");
  });

  it("generate() embeds the signal in the line", () => {
    const result = generator.generate("bloodmoon");
    expect(result.line).toContain("bloodmoon");
  });

  it("generate() returns a string for the line property", () => {
    expect(typeof generator.generate("eclipse").line).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// WarForecast
// ---------------------------------------------------------------------------
describe("WarForecast", () => {
  let forecast: WarForecast;

  beforeEach(() => { forecast = new WarForecast(); });

  it("risk is between 0 and 1", () => {
    const { risk } = forecast.evaluate(0.5, 0.5);
    expect(risk).toBeGreaterThanOrEqual(0);
    expect(risk).toBeLessThanOrEqual(1);
  });

  it("zero tension and zero resources yields 0 risk", () => {
    expect(forecast.evaluate(0, 0).risk).toBeCloseTo(0);
  });

  it("max tension and max resources clamps to 1", () => {
    expect(forecast.evaluate(1, 1).risk).toBeCloseTo(1);
  });

  it("tension has more weight than resources (0.7 vs 0.3)", () => {
    const highTension = forecast.evaluate(1, 0).risk;
    const highResources = forecast.evaluate(0, 1).risk;
    expect(highTension).toBeGreaterThan(highResources);
  });
});

// ---------------------------------------------------------------------------
// TelemetryCollector
// ---------------------------------------------------------------------------
describe("TelemetryCollector", () => {
  let collector: TelemetryCollector;

  beforeEach(() => { collector = new TelemetryCollector(); });

  it("list() is empty by default", () => {
    expect(collector.list()).toHaveLength(0);
  });

  it("record() adds an event", () => {
    collector.record("player_join", { id: "p1" });
    expect(collector.list()).toHaveLength(1);
  });

  it("recorded event has the correct type", () => {
    collector.record("npc_spawn", {});
    expect(collector.list()[0].type).toBe("npc_spawn");
  });

  it("recorded event preserves payload", () => {
    collector.record("combat", { damage: 42 });
    expect(collector.list()[0].payload).toEqual({ damage: 42 });
  });

  it("recorded event has a createdAt timestamp", () => {
    const before = Date.now();
    collector.record("tick", {});
    const after = Date.now();
    const event = collector.list()[0];
    expect(event.createdAt).toBeGreaterThanOrEqual(before);
    expect(event.createdAt).toBeLessThanOrEqual(after);
  });

  it("multiple events accumulate in order", () => {
    collector.record("a", {});
    collector.record("b", {});
    collector.record("c", {});
    expect(collector.list().map((e: any) => e.type)).toEqual(["a", "b", "c"]);
  });
});

// ---------------------------------------------------------------------------
// PerformanceBudget
// ---------------------------------------------------------------------------
describe("PerformanceBudget", () => {
  it("activeChunksPerObserver is 9", () => {
    expect(PerformanceBudget.activeChunksPerObserver).toBe(9);
  });

  it("maxNPCUpdatesPerTick is 200", () => {
    expect(PerformanceBudget.maxNPCUpdatesPerTick).toBe(200);
  });

  it("maxEventsPerTick is 50", () => {
    expect(PerformanceBudget.maxEventsPerTick).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// HousingSystem
// ---------------------------------------------------------------------------
describe("HousingSystem", () => {
  let housing: HousingSystem;

  beforeEach(() => { housing = new HousingSystem(); });

  it("createHouse() returns ownerId", () => {
    const house = housing.createHouse("p1", "plot_A");
    expect(house.ownerId).toBe("p1");
  });

  it("createHouse() returns plotId", () => {
    const house = housing.createHouse("p1", "plot_B");
    expect(house.plotId).toBe("plot_B");
  });

  it("createHouse() starts with 0 upgrades", () => {
    const house = housing.createHouse("p1", "plot_C");
    expect(house.upgrades).toBe(0);
  });

  it("createHouse() includes a createdAt timestamp", () => {
    const before = Date.now();
    const house = housing.createHouse("p1", "plot_D");
    const after = Date.now();
    expect(house.createdAt).toBeGreaterThanOrEqual(before);
    expect(house.createdAt).toBeLessThanOrEqual(after);
  });
});

// ---------------------------------------------------------------------------
// OwnershipRegistry
// ---------------------------------------------------------------------------
describe("OwnershipRegistry", () => {
  let registry: OwnershipRegistry;

  beforeEach(() => { registry = new OwnershipRegistry(); });

  it("get() returns null for unregistered object", () => {
    expect(registry.get("castle_1")).toBeNull();
  });

  it("register() then get() returns the ownership record", () => {
    registry.register("castle_1", "kingdom", "k_areloria");
    const record = registry.get("castle_1");
    expect(record).toEqual({ ownerType: "kingdom", ownerId: "k_areloria" });
  });

  it("register() overwrites an existing record", () => {
    registry.register("plot_A", "player", "p1");
    registry.register("plot_A", "guild", "guild_iron");
    expect(registry.get("plot_A")?.ownerId).toBe("guild_iron");
  });

  it("different objects track independently", () => {
    registry.register("obj_1", "player", "p1");
    registry.register("obj_2", "player", "p2");
    expect(registry.get("obj_1")?.ownerId).toBe("p1");
    expect(registry.get("obj_2")?.ownerId).toBe("p2");
  });
});

// ---------------------------------------------------------------------------
// DungeonGenerator
// ---------------------------------------------------------------------------
describe("DungeonGenerator", () => {
  const validTypes = [
    "hall",
    "treasure_room",
    "monster_lair",
    "collapsed_passage",
    "ancient_shrine",
  ];
  let gen: DungeonGenerator;

  beforeEach(() => { gen = new DungeonGenerator(); });

  it("generate() returns the seed used", () => {
    expect(gen.generate(42).seed).toBe(42);
  });

  it("generate() returns at least 4 rooms", () => {
    expect(gen.generate(1).rooms.length).toBeGreaterThanOrEqual(4);
  });

  it("generate() returns at most 10 rooms", () => {
    // 4 + floor(|sin(seed)| * 6) <= 4 + 6 = 10
    for (const seed of [0, 1, 5, 100, -7]) {
      expect(gen.generate(seed).rooms.length).toBeLessThanOrEqual(10);
    }
  });

  it("every room has a valid type", () => {
    const dungeon = gen.generate(99);
    dungeon.rooms.forEach((room: any) => {
      expect(validTypes).toContain(room.type);
    });
  });

  it("every room has a danger between 1 and 5", () => {
    const dungeon = gen.generate(7);
    dungeon.rooms.forEach((room: any) => {
      expect(room.danger).toBeGreaterThanOrEqual(1);
      expect(room.danger).toBeLessThanOrEqual(5);
    });
  });

  it("randomRoom() returns a valid room type", () => {
    for (let i = 0; i < 10; i++) {
      expect(validTypes).toContain(gen.randomRoom(i));
    }
  });

  it("seed 0 produces rooms with incrementing danger correctly", () => {
    const dungeon = gen.generate(0);
    dungeon.rooms.forEach((room: any, index: number) => {
      expect(room.danger).toBe(1 + (index % 5));
    });
  });
});

// ---------------------------------------------------------------------------
// PacketRouter
// ---------------------------------------------------------------------------
describe("PacketRouter", () => {
  let router: PacketRouter;

  beforeEach(() => { router = new PacketRouter(); });

  it("route() returns handled: true", () => {
    expect(router.route({ type: "move" }).handled).toBe(true);
  });

  it("route() returns the packet type", () => {
    expect(router.route({ type: "attack" }).type).toBe("attack");
  });

  it("route() returns 'unknown' for packet without type", () => {
    expect(router.route({}).type).toBe("unknown");
  });

  it("route() handles null packet with 'unknown' type", () => {
    expect(router.route(null).type).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// GameConfig
// ---------------------------------------------------------------------------
describe("GameConfig", () => {
  it("chunkSize is 64", () => {
    expect(GameConfig.chunkSize).toBe(64);
  });

  it("tickRateMs is 100", () => {
    expect(GameConfig.tickRateMs).toBe(100);
  });

  it("defaultPort is 3000", () => {
    expect(GameConfig.defaultPort).toBe(3000);
  });

  it("matrixCurrency is 'matrix_energy'", () => {
    expect(GameConfig.matrixCurrency).toBe("matrix_energy");
  });
  it("interactDistance is 25", () => {
    expect(GameConfig.interactDistance).toBe(25);
  });

  it("attackDistance is 35", () => {
    expect(GameConfig.attackDistance).toBe(35);
  });
});


// ---------------------------------------------------------------------------
// FeatureFlags
// ---------------------------------------------------------------------------
describe("FeatureFlags", () => {
  it("enableOracle is true", () => {
    expect(FeatureFlags.enableOracle).toBe(true);
  });

  it("enableWeather is true", () => {
    expect(FeatureFlags.enableWeather).toBe(true);
  });

  it("enableSeasons is true", () => {
    expect(FeatureFlags.enableSeasons).toBe(true);
  });

  it("enableGMEditor is true", () => {
    expect(FeatureFlags.enableGMEditor).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// NPCSpawnTable
// ---------------------------------------------------------------------------
describe("NPCSpawnTable", () => {
  it("starter_town has a merchant", () => {
    expect(NPCSpawnTable.starter_town).toContain("merchant");
  });

  it("starter_town has a guard", () => {
    expect(NPCSpawnTable.starter_town).toContain("guard");
  });

  it("ruins has an oracle", () => {
    expect(NPCSpawnTable.ruins).toContain("oracle");
  });

  it("capital has a chronicler", () => {
    expect(NPCSpawnTable.capital).toContain("chronicler");
  });
});

// ---------------------------------------------------------------------------
// NPCProfessions
// ---------------------------------------------------------------------------
describe("NPCProfessions", () => {
  it("merchant has marketRole true", () => {
    expect(NPCProfessions.merchant.marketRole).toBe(true);
  });

  it("blacksmith has station 'forge'", () => {
    expect(NPCProfessions.blacksmith.station).toBe("forge");
  });

  it("farmer has station 'field'", () => {
    expect(NPCProfessions.farmer.station).toBe("field");
  });

  it("oracle has station 'shrine'", () => {
    expect(NPCProfessions.oracle.station).toBe("shrine");
  });

  it("guard has a scheduleKey", () => {
    expect(NPCProfessions.guard.scheduleKey).toBeDefined();
  });
});
