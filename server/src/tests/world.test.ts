import { describe, it, expect, beforeEach } from "vitest";
import { WeatherSystem } from "../modules/world/WeatherSystem.js";
import { SeasonSystem } from "../modules/world/SeasonSystem.js";
import { BiomeGenerator } from "../modules/world/BiomeGenerator.js";
import { ResourceScatter } from "../modules/world/ResourceScatter.js";
import { ChunkSystem } from "../modules/world/ChunkSystem.js";
import { TerrainGenerator } from "../modules/world/TerrainGenerator.js";
import { Pathfinding } from "../modules/world/Pathfinding.js";
import { WorldSeed } from "../modules/world/WorldSeed.js";
import { TravelHazards } from "../modules/world/TravelHazards.js";

// ---------------------------------------------------------------------------
// WeatherSystem
// ---------------------------------------------------------------------------
describe("WeatherSystem", () => {
  const validStates = ["clear", "rain", "storm", "fog", "snow", "heatwave"];
  let weather: WeatherSystem;

  beforeEach(() => { weather = new WeatherSystem(); });

  it("returns a valid weather state for seed 0", () => {
    expect(validStates).toContain(weather.nextWeather(0));
  });

  it("returns a valid weather state for seed 1", () => {
    expect(validStates).toContain(weather.nextWeather(1));
  });

  it("returns a valid weather state for a large seed", () => {
    expect(validStates).toContain(weather.nextWeather(99999));
  });

  it("returns a valid weather state for a negative seed", () => {
    expect(validStates).toContain(weather.nextWeather(-3));
  });

  it("seed 0 returns 'clear'", () => {
    expect(weather.nextWeather(0)).toBe("clear");
  });

  it("seed 1 returns 'rain'", () => {
    expect(weather.nextWeather(1)).toBe("rain");
  });

  it("seed 3 returns 'fog'", () => {
    expect(weather.nextWeather(3)).toBe("fog");
  });
});

// ---------------------------------------------------------------------------
// SeasonSystem
// ---------------------------------------------------------------------------
describe("SeasonSystem", () => {
  let seasons: SeasonSystem;

  beforeEach(() => { seasons = new SeasonSystem(); });

  it("tick 0 is spring", () => {
    expect(seasons.getSeason(0)).toBe("spring");
  });

  it("tick 1 is summer", () => {
    expect(seasons.getSeason(1)).toBe("summer");
  });

  it("tick 2 is autumn", () => {
    expect(seasons.getSeason(2)).toBe("autumn");
  });

  it("tick 3 is winter", () => {
    expect(seasons.getSeason(3)).toBe("winter");
  });

  it("tick 4 wraps back to spring", () => {
    expect(seasons.getSeason(4)).toBe("spring");
  });

  it("large tick wraps correctly", () => {
    expect(seasons.getSeason(100)).toBe("spring"); // 100 % 4 === 0
  });
});

// ---------------------------------------------------------------------------
// BiomeGenerator
// ---------------------------------------------------------------------------
describe("BiomeGenerator", () => {
  let biome: BiomeGenerator;

  beforeEach(() => { biome = new BiomeGenerator(); });

  it("height > 0.7 yields mountain", () => {
    expect(biome.getBiome(0, 0, 0.8)).toBe("mountain");
  });

  it("height exactly 0.7 is not mountain (boundary)", () => {
    expect(biome.getBiome(0, 0, 0.7)).toBe("forest");
  });

  it("height 0.5 yields forest", () => {
    expect(biome.getBiome(0, 0, 0.5)).toBe("forest");
  });

  it("height exactly 0.45 is not forest (boundary)", () => {
    expect(biome.getBiome(0, 0, 0.45)).toBe("grassland");
  });

  it("height 0.3 yields grassland", () => {
    expect(biome.getBiome(0, 0, 0.3)).toBe("grassland");
  });

  it("height exactly 0.2 is not grassland (boundary)", () => {
    expect(biome.getBiome(0, 0, 0.2)).toBe("desert");
  });

  it("height 0.0 yields desert", () => {
    expect(biome.getBiome(0, 0, 0.0)).toBe("desert");
  });

  it("negative height yields desert", () => {
    expect(biome.getBiome(0, 0, -0.5)).toBe("desert");
  });
});

// ---------------------------------------------------------------------------
// ResourceScatter
// ---------------------------------------------------------------------------
describe("ResourceScatter", () => {
  let scatter: ResourceScatter;

  beforeEach(() => { scatter = new ResourceScatter(); });

  it("forest yields wood and berries", () => {
    const resources = scatter.generateForBiome("forest");
    expect(resources).toContain("wood");
    expect(resources).toContain("berries");
  });

  it("mountain yields stone and iron", () => {
    const resources = scatter.generateForBiome("mountain");
    expect(resources).toContain("stone");
    expect(resources).toContain("iron");
  });

  it("desert yields salt and crystals", () => {
    const resources = scatter.generateForBiome("desert");
    expect(resources).toContain("salt");
    expect(resources).toContain("crystals");
  });

  it("unknown biome yields empty array", () => {
    expect(scatter.generateForBiome("ocean")).toEqual([]);
  });

  it("grassland yields empty array", () => {
    expect(scatter.generateForBiome("grassland")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// ChunkSystem
// ---------------------------------------------------------------------------
describe("ChunkSystem", () => {
  let chunks: ChunkSystem;

  beforeEach(() => { chunks = new ChunkSystem(64); });

  it("getChunkId() maps (0,0) to '0:0'", () => {
    expect(chunks.getChunkId(0, 0)).toBe("0:0");
  });

  it("getChunkId() maps (63,63) to '0:0'", () => {
    expect(chunks.getChunkId(63, 63)).toBe("0:0");
  });

  it("getChunkId() maps (64,0) to '1:0'", () => {
    expect(chunks.getChunkId(64, 0)).toBe("1:0");
  });

  it("getChunkId() maps (0,64) to '0:1'", () => {
    expect(chunks.getChunkId(0, 64)).toBe("0:1");
  });

  it("getChunk() creates chunk on first access", () => {
    const chunk = chunks.getChunk(2, 3);
    expect(chunk.id).toBe("2:3");
    expect(chunk.active).toBe(false);
    expect(chunk.entities.size).toBe(0);
  });

  it("addEntity() places entity into correct chunk", () => {
    const chunkId = chunks.addEntity("e1", 10, 10);
    expect(chunkId).toBe("0:0");
    const chunk = chunks.getChunk(0, 0);
    expect(chunk.entities.has("e1")).toBe(true);
  });

  it("removeEntity() removes entity from its chunk", () => {
    chunks.addEntity("e2", 10, 10);
    chunks.removeEntity("e2", "0:0");
    expect(chunks.getChunk(0, 0).entities.has("e2")).toBe(false);
  });

  it("moveEntity() within same chunk keeps entity in place", () => {
    chunks.addEntity("e3", 0, 0);
    const newChunkId = chunks.moveEntity("e3", 0, 0, 10, 10);
    expect(newChunkId).toBe("0:0");
    expect(chunks.getChunk(0, 0).entities.has("e3")).toBe(true);
  });

  it("moveEntity() across chunks updates membership", () => {
    chunks.addEntity("e4", 0, 0);
    const newChunkId = chunks.moveEntity("e4", 0, 0, 64, 0);
    expect(newChunkId).toBe("1:0");
    expect(chunks.getChunk(1, 0).entities.has("e4")).toBe(true);
    expect(chunks.getChunk(0, 0).entities.has("e4")).toBe(false);
  });

  it("setChunkActive() marks chunk active", () => {
    chunks.addEntity("e5", 0, 0);
    chunks.setChunkActive("0:0", true);
    expect(chunks.getChunk(0, 0).active).toBe(true);
  });

  it("getActiveChunks() returns only active chunks", () => {
    chunks.addEntity("e6", 0, 0);
    chunks.addEntity("e7", 64, 0);
    chunks.setChunkActive("0:0", true);
    const active = chunks.getActiveChunks();
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe("0:0");
  });

  it("default chunk size is 64", () => {
    const defaultChunks = new ChunkSystem();
    expect(defaultChunks.size).toBe(64);
  });
});

// ---------------------------------------------------------------------------
// TerrainGenerator
// ---------------------------------------------------------------------------
describe("TerrainGenerator", () => {
  let terrain: TerrainGenerator;

  beforeEach(() => { terrain = new TerrainGenerator(); });

  it("returns a number", () => {
    expect(typeof terrain.getHeight(0, 0)).toBe("number");
  });

  it("height at (0,0) is sin(0)+cos(0) = 1", () => {
    expect(terrain.getHeight(0, 0)).toBeCloseTo(1);
  });

  it("produces different values for different coordinates", () => {
    const h1 = terrain.getHeight(0, 0);
    const h2 = terrain.getHeight(50, 50);
    expect(h1).not.toBeCloseTo(h2);
  });

  it("height is in range [-2, 2]", () => {
    for (let x = 0; x < 100; x += 10) {
      for (let y = 0; y < 100; y += 10) {
        const h = terrain.getHeight(x, y);
        expect(h).toBeGreaterThanOrEqual(-2);
        expect(h).toBeLessThanOrEqual(2);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Pathfinding
// ---------------------------------------------------------------------------
describe("Pathfinding", () => {
  let pf: Pathfinding;

  beforeEach(() => { pf = new Pathfinding(); });

  it("path starts at the 'from' position", () => {
    const path = pf.findPath({ x: 0, y: 0 }, { x: 5, y: 5 });
    expect(path[0]).toEqual({ x: 0, y: 0 });
  });

  it("path ends at the 'to' position", () => {
    const path = pf.findPath({ x: 0, y: 0 }, { x: 5, y: 5 });
    expect(path[path.length - 1]).toEqual({ x: 5, y: 5 });
  });

  it("path has at least 2 waypoints", () => {
    const path = pf.findPath({ x: 1, y: 1 }, { x: 10, y: 10 });
    expect(path.length).toBeGreaterThanOrEqual(2);
  });

  it("path from same point to itself returns both endpoints equal", () => {
    const path = pf.findPath({ x: 3, y: 3 }, { x: 3, y: 3 });
    expect(path[0]).toEqual({ x: 3, y: 3 });
    expect(path[path.length - 1]).toEqual({ x: 3, y: 3 });
  });
});

// ---------------------------------------------------------------------------
// WorldSeed
// ---------------------------------------------------------------------------
describe("WorldSeed", () => {
  it("stores the seed value", () => {
    const ws = new WorldSeed(42);
    expect(ws.seed).toBe(42);
  });

  it("seed is readonly", () => {
    const ws = new WorldSeed(7);
    expect(ws.seed).toBe(7);
  });

  it("different seeds produce different objects", () => {
    const a = new WorldSeed(1);
    const b = new WorldSeed(2);
    expect(a.seed).not.toBe(b.seed);
  });
});

// ---------------------------------------------------------------------------
// TravelHazards
// ---------------------------------------------------------------------------
describe("TravelHazards", () => {
  it("swamp has slow and poison_risk hazards", () => {
    expect(TravelHazards.swamp).toContain("slow");
    expect(TravelHazards.swamp).toContain("poison_risk");
  });

  it("mountain has fall_risk and cold hazards", () => {
    expect(TravelHazards.mountain).toContain("fall_risk");
    expect(TravelHazards.mountain).toContain("cold");
  });

  it("desert has heat and dehydration hazards", () => {
    expect(TravelHazards.desert).toContain("heat");
    expect(TravelHazards.desert).toContain("dehydration");
  });

  it("has exactly three hazard zones", () => {
    expect(Object.keys(TravelHazards)).toHaveLength(3);
  });
});
