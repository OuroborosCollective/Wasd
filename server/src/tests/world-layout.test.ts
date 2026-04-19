import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  WorldLayoutRuleEngine,
  createDefaultLayoutConfig,
  WorldLayoutSpatialIndex,
  WorldLayoutValidator,
  resolveCategory,
  resolveFootprint,
  getEntityAABB,
  aabbOverlap,
  pointDistance,
  createBuildingPlacementRule,
  createRoadConnectivityRule,
  createWallConnectivityRule,
  createDoorValidatorRule,
  createDungeonDistanceRule,
  createPathValidatorRule,
  createGLBPlacementRule,
} from "../world/layout/index.js";
import type { SpatialEntity, GLBFootprintDescriptor, WorldLayoutConfig } from "../world/layout/WorldLayoutTypes.js";

function makeEntity(overrides: Partial<SpatialEntity> & { id: string; position: { x: number; y: number } }): SpatialEntity {
  return {
    type: "building",
    category: "house",
    footprint: {
      assetPath: "",
      category: "house",
      width: 8,
      depth: 8,
      height: 6,
      minSpacing: 2,
      requiresRoadAccess: true,
      doorwaySide: "south",
    },
    ...overrides,
  };
}

function makeConfig(tmpDir: string): WorldLayoutConfig {
  return {
    ...createDefaultLayoutConfig(tmpDir),
    autoRepairEnabled: true,
    verbose: false,
  };
}

describe("WorldLayoutHeal", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "layout-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ─── Spatial Index ─────────────────────────────────────────────────────

  describe("SpatialIndex", () => {
    it("inserts and queries entities", () => {
      const idx = new WorldLayoutSpatialIndex(32);
      const e1 = makeEntity({ id: "h1", position: { x: 0, y: 0 }, category: "house" });
      const e2 = makeEntity({ id: "h2", position: { x: 20, y: 0 }, category: "house" });
      idx.insert(e1);
      idx.insert(e2);

      expect(idx.size).toBe(2);
      expect(idx.get("h1")).toBeDefined();
      const nearby = idx.queryRadius(0, 0, 15);
      expect(nearby.length).toBe(1);
      expect(nearby[0].id).toBe("h1");
    });

    it("detects AABB overlap", () => {
      const idx = new WorldLayoutSpatialIndex(32);
      const e1 = makeEntity({ id: "h1", position: { x: 0, y: 0 }, category: "house" });
      const e2 = makeEntity({ id: "h2", position: { x: 1, y: 0 }, category: "house" });
      idx.insert(e1);
      idx.insert(e2);

      const hits = idx.queryAABB(getEntityAABB(e1));
      expect(hits.some((h) => h.id === "h2")).toBe(true);
    });

    it("removes entities", () => {
      const idx = new WorldLayoutSpatialIndex(32);
      idx.insert(makeEntity({ id: "h1", position: { x: 0, y: 0 } }));
      idx.remove("h1");
      expect(idx.size).toBe(0);
    });
  });

  // ─── Footprint Resolver ────────────────────────────────────────────────

  describe("FootprintResolver", () => {
    it("resolves category from type", () => {
      expect(resolveCategory("building", "hut")).toBe("house");
      expect(resolveCategory("prop", "well")).toBe("decoration");
    });

    it("resolves category from name patterns", () => {
      expect(resolveCategory("unknown", "stone_wall")).toBe("wall");
      expect(resolveCategory("unknown", "boss_lair")).toBe("dungeon");
      expect(resolveCategory("unknown", "big_castle")).toBe("castle");
    });

    it("returns default footprint for unknown", () => {
      const fp = resolveFootprint(undefined, "unknown");
      expect(fp.width).toBeGreaterThan(0);
      expect(fp.depth).toBeGreaterThan(0);
    });

    it("uses registry over defaults", () => {
      const registry = new Map<string, GLBFootprintDescriptor>();
      registry.set("custom.glb", { assetPath: "custom.glb", category: "house", width: 20, depth: 20 });
      const fp = resolveFootprint("custom.glb", "house", registry);
      expect(fp.width).toBe(20);
    });
  });

  // ─── Building Placement Validator ──────────────────────────────────────

  describe("BuildingPlacementValidator", () => {
    it("detects overlapping buildings", () => {
      const config = makeConfig(tmpDir);
      const engine = new WorldLayoutRuleEngine(config);
      engine.loadEntities([
        { id: "h1", type: "building", name: "House A", position: { x: 0, y: 0 } },
        { id: "h2", type: "building", name: "House B", position: { x: 1, y: 0 } },
      ]);
      const result = engine.validate();
      expect(result.ok).toBe(false);
      expect(result.issues.some((i) => i.code === "building_overlap")).toBe(true);
    });

    it("detects buildings too close", () => {
      const config = makeConfig(tmpDir);
      const engine = new WorldLayoutRuleEngine(config);
      engine.loadEntities([
        { id: "h1", type: "building", name: "House A", position: { x: 0, y: 0 } },
        { id: "h2", type: "building", name: "House B", position: { x: 9.5, y: 0 } }, // 9.5 apart, min spacing 2 each side = 10 total
      ]);
      const result = engine.validate();
      // Should detect either overlap or too_close
      expect(result.issues.some((i) => i.code === "building_too_close" || i.code === "building_overlap")).toBe(true);
    });

    it("allows properly spaced buildings", () => {
      const config = makeConfig(tmpDir);
      const engine = new WorldLayoutRuleEngine(config);
      engine.loadEntities([
        { id: "h1", type: "building", name: "House A", position: { x: 0, y: 0 } },
        { id: "h2", type: "building", name: "House B", position: { x: 50, y: 0 } },
        { id: "r1", type: "road", name: "Road", position: { x: 25, y: 0 } },
      ]);
      const result = engine.validate();
      const overlapIssues = result.issues.filter((i) => i.code === "building_overlap");
      expect(overlapIssues.length).toBe(0);
    });

    it("detects building without road access", () => {
      const config = makeConfig(tmpDir);
      const engine = new WorldLayoutRuleEngine(config);
      engine.loadEntities([
        { id: "h1", type: "building", name: "House A", position: { x: 0, y: 0 } },
        { id: "r1", type: "road", name: "Road", position: { x: 100, y: 0 } }, // too far
      ]);
      const result = engine.validate();
      expect(result.issues.some((i) => i.code === "building_no_road_access")).toBe(true);
    });
  });

  // ─── Wall Connectivity Validator ───────────────────────────────────────

  describe("WallConnectivityValidator", () => {
    it("detects wall with no gate", () => {
      const config = makeConfig(tmpDir);
      const engine = new WorldLayoutRuleEngine(config);
      engine.loadEntities([
        { id: "w1", type: "wall", name: "Wall North", position: { x: 0, y: 0 } },
        { id: "w2", type: "wall", name: "Wall East", position: { x: 8, y: 0 } },
        { id: "w3", type: "wall", name: "Wall South", position: { x: 16, y: 0 } },
        { id: "w4", type: "wall", name: "Wall West", position: { x: 24, y: 0 } },
      ]);
      const result = engine.validate();
      expect(result.issues.some((i) => i.code === "wall_no_gate")).toBe(true);
    });

    it("accepts wall with gate", () => {
      const config = makeConfig(tmpDir);
      const engine = new WorldLayoutRuleEngine(config);
      engine.loadEntities([
        { id: "w1", type: "wall", name: "Wall A", position: { x: 0, y: 0 } },
        { id: "w2", type: "wall", name: "Wall B", position: { x: 8, y: 0 } },
        { id: "w3", type: "wall", name: "Wall C", position: { x: 16, y: 0 } },
        { id: "w4", type: "wall", name: "Wall D", position: { x: 24, y: 0 } },
        { id: "g1", type: "gate", name: "Main Gate", position: { x: 32, y: 0 } },
      ]);
      const result = engine.validate();
      const noGate = result.issues.filter((i) => i.code === "wall_no_gate");
      expect(noGate.length).toBe(0);
    });
  });

  // ─── Door Validator ────────────────────────────────────────────────────

  describe("DoorValidator", () => {
    it("detects door blocked by another building", () => {
      const config = makeConfig(tmpDir);
      const engine = new WorldLayoutRuleEngine(config);
      engine.loadEntities([
        { id: "h1", type: "building", name: "House", position: { x: 0, y: 0 } },
        { id: "h2", type: "building", name: "Blocking House", position: { x: 0, y: 7 } }, // South of h1, door is south
      ]);
      const result = engine.validate();
      expect(result.issues.some((i) => i.code === "door_blocked")).toBe(true);
    });
  });

  // ─── Dungeon Distance Validator ────────────────────────────────────────

  describe("DungeonDistanceValidator", () => {
    it("detects dungeon too close to city", () => {
      const config = makeConfig(tmpDir);
      const engine = new WorldLayoutRuleEngine(config);
      engine.loadEntities([
        { id: "h1", type: "building", name: "House A", position: { x: 0, y: 0 } },
        { id: "h2", type: "building", name: "House B", position: { x: 10, y: 0 } },
        { id: "h3", type: "building", name: "House C", position: { x: 5, y: 10 } },
        { id: "d1", type: "dungeon", name: "Boss Dungeon", position: { x: 100, y: 0 } }, // 100 units from city
      ]);
      const result = engine.validate();
      // Dungeon is 100 units from city, minimum is 2080 for non-boss (4160*0.5)
      expect(result.issues.some((i) => i.code === "dungeon_too_close" || i.code === "boss_dungeon_too_close")).toBe(true);
    });

    it("allows dungeon far from city", () => {
      const config = makeConfig(tmpDir);
      const engine = new WorldLayoutRuleEngine(config);
      engine.loadEntities([
        { id: "h1", type: "building", name: "House A", position: { x: 0, y: 0 } },
        { id: "h2", type: "building", name: "House B", position: { x: 10, y: 0 } },
        { id: "d1", type: "dungeon", name: "Far Dungeon", position: { x: 5000, y: 0 } }, // far enough
      ]);
      const result = engine.validate();
      const dungeonIssues = result.issues.filter((i) => i.code === "boss_dungeon_too_close" || i.code === "dungeon_too_close");
      expect(dungeonIssues.length).toBe(0);
    });
  });

  // ─── GLB Placement Validator ──────────────────────────────────────────

  describe("GLBPlacementValidator", () => {
    it("detects floating asset", () => {
      const config = makeConfig(tmpDir);
      const engine = new WorldLayoutRuleEngine(config);
      engine.loadEntities([
        { id: "h1", type: "building", name: "House", position: { x: 0, y: 0 } },
      ]);
      // Manually set positionZ to simulate floating
      const idx = engine.getSpatialIndex();
      const entity = idx.get("h1");
      if (entity) entity.positionZ = 10;

      const result = engine.validate();
      expect(result.issues.some((i) => i.code === "glb_floating")).toBe(true);
    });

    it("detects buried asset", () => {
      const config = makeConfig(tmpDir);
      const engine = new WorldLayoutRuleEngine(config);
      engine.loadEntities([
        { id: "h1", type: "building", name: "House", position: { x: 0, y: 0 } },
      ]);
      const idx = engine.getSpatialIndex();
      const entity = idx.get("h1");
      if (entity) entity.positionZ = -5;

      const result = engine.validate();
      expect(result.issues.some((i) => i.code === "glb_buried")).toBe(true);
    });

    it("detects GLB overlap", () => {
      const config = makeConfig(tmpDir);
      const engine = new WorldLayoutRuleEngine(config);
      engine.loadEntities([
        { id: "h1", type: "building", name: "House A", position: { x: 0, y: 0 } },
        { id: "h2", type: "building", name: "House B", position: { x: 1, y: 0 } },
      ]);
      const result = engine.validate();
      expect(result.issues.some((i) => i.code === "glb_overlap")).toBe(true);
    });

    it("does NOT flag valid layout", () => {
      const config = makeConfig(tmpDir);
      const engine = new WorldLayoutRuleEngine(config);
      engine.loadEntities([
        { id: "h1", type: "building", name: "House A", position: { x: 0, y: 0 } },
        { id: "h2", type: "building", name: "House B", position: { x: 50, y: 0 } },
        { id: "h3", type: "building", name: "House C", position: { x: 0, y: 50 } },
        { id: "r1", type: "road", name: "Main Road", position: { x: 25, y: 0 } },
        { id: "r2", type: "road", name: "Cross Road", position: { x: 0, y: 25 } },
        { id: "w1", type: "wall", name: "Wall A", position: { x: -10, y: -10 } },
        { id: "w2", type: "wall", name: "Wall B", position: { x: -2, y: -10 } },
        { id: "g1", type: "gate", name: "Gate", position: { x: 6, y: -10 } },
      ]);
      const result = engine.validate();
      const overlapIssues = result.issues.filter(
        (i) => i.code === "building_overlap" || i.code === "glb_overlap"
      );
      expect(overlapIssues.length).toBe(0);
    });
  });

  // ─── Repair Service ────────────────────────────────────────────────────

  describe("RepairService", () => {
    it("repairs building overlap by moving", async () => {
      const config = makeConfig(tmpDir);
      const engine = new WorldLayoutRuleEngine(config);
      engine.loadEntities([
        { id: "h1", type: "building", name: "House A", position: { x: 0, y: 0 } },
        { id: "h2", type: "building", name: "House B", position: { x: 1, y: 0 } },
      ]);

      const { validation, repair } = await engine.validateAndRepair();
      expect(repair).not.toBeNull();
      expect(repair!.repaired).toBeGreaterThan(0);
      expect(repair!.actions.some((a) => a.type === "move" && a.success)).toBe(true);
    });

    it("repairs floating asset by snapping", async () => {
      const config = makeConfig(tmpDir);
      const engine = new WorldLayoutRuleEngine(config);
      engine.loadEntities([
        { id: "h1", type: "building", name: "House", position: { x: 0, y: 0 } },
      ]);
      const idx = engine.getSpatialIndex();
      const entity = idx.get("h1");
      if (entity) entity.positionZ = 10;

      const { repair } = await engine.validateAndRepair();
      expect(repair).not.toBeNull();
      expect(repair!.actions.some((a) => a.type === "snap" && a.success)).toBe(true);
    });
  });

  // ─── Rule Engine Integration ───────────────────────────────────────────

  describe("RuleEngine", () => {
    it("reports correct health status", () => {
      const config = makeConfig(tmpDir);
      const engine = new WorldLayoutRuleEngine(config);
      engine.loadEntities([
        { id: "h1", type: "building", name: "House", position: { x: 0, y: 0 } },
        { id: "r1", type: "road", name: "Road", position: { x: 10, y: 0 } },
      ]);
      engine.validate();
      const health = engine.getHealthStatus();
      expect(health.score).toBeGreaterThan(0);
      expect(typeof health.ok).toBe("boolean");
    });

    it("loads entities from WorldObjectSystem format", () => {
      const config = makeConfig(tmpDir);
      const engine = new WorldLayoutRuleEngine(config);
      engine.loadEntities([
        { id: "sv_well", type: "prop", name: "Village Well", position: { x: 0, y: 5 }, rotation: 0, scale: 2.5, glbPath: "/assets/models/marketplace/Marketplace_well.glb" },
        { id: "sv_hut_a", type: "building", name: "Hut", position: { x: -10, y: 4 }, rotation: 0.4, scale: 4, glbPath: "/assets/models/structures/woodcillagehouse1.glb" },
      ]);
      expect(engine.getStats().entityCount).toBe(2);
    });

    it("integrates with LiveHeal adapter", async () => {
      const { createWorldLayoutAdapter } = await import("../world/layout/WorldLayoutHealIntegration.js");
      const config = makeConfig(tmpDir);
      const engine = new WorldLayoutRuleEngine(config);
      const objects = [
        { id: "h1", type: "building", name: "House", position: { x: 0, y: 0 } },
      ];
      const adapter = createWorldLayoutAdapter(engine, {
        getWorldObjects: () => objects,
        checkEveryNTicks: 1,
      });
      expect(adapter.id).toBe("world-layout");
      const snapshot = adapter.getHealthSnapshot();
      expect(snapshot.ok).toBeDefined();
      expect(snapshot.score).toBeGreaterThanOrEqual(0);
    });
  });
});
