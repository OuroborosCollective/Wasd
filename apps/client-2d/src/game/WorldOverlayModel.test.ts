import { describe, expect, it } from "vitest";
import {
  deriveWorldOverlayModel,
  EMPTY_WORLD_OVERLAY_MODEL,
  type WorldOverlayModel,
} from "./WorldOverlayModel";
import type { LiveGameplaySnapshot } from "./liveGameplaySnapshot";
import { WORLD_SURFACE_SCHEMA_VERSION, type WorldSurfaceSnapshot } from "./worldSurface";

function makeLiveSnapshot(
  overrides: Partial<LiveGameplaySnapshot> & { worldSurface?: WorldSurfaceSnapshot } = {},
): LiveGameplaySnapshot & {
  readonly worldSurface: WorldSurfaceSnapshot;
} {
  const base: LiveGameplaySnapshot & { readonly worldSurface: WorldSurfaceSnapshot } = {
    status: "live",
    serverTick: 42,
    character: null,
    paperdoll: { character: null, slots: [] },
    quests: [],
    skills: [],
    resources: [],
    inventory: {
      playerId: "p1",
      schemaVersion: 1,
      slots: [],
      capacity: 32,
    },
    crafting: { recipes: [] },
    equipment: null,
    guild: {
      id: null,
      name: null,
      memberCount: 0,
      rank: null,
      villageEligible: false,
      treasury: null,
    },
    factions: [],
    map: {
      regionName: "test",
      chunkX: 0,
      chunkZ: 0,
      visibleChunks: 1,
      biome: "forest",
    },
    wallet: { coin: 0 },
    worldPois: [],
    vendorEconomy: { vendors: [] },
    campNpcs: [],
    campStocks: [],
    processingStations: [],
    worldSurface: {
      schemaVersion: WORLD_SURFACE_SCHEMA_VERSION,
      tick: 7,
      groups: [],
      points: [],
    },
  };
  return { ...base, ...overrides } as LiveGameplaySnapshot & { readonly worldSurface: WorldSurfaceSnapshot };
}

describe("WorldOverlayModel", () => {
  it("returns empty waiting model for null/undefined input", () => {
    expect(deriveWorldOverlayModel(null)).toBe(EMPTY_WORLD_OVERLAY_MODEL);
    expect(deriveWorldOverlayModel(undefined)).toBe(EMPTY_WORLD_OVERLAY_MODEL);
  });

  it("derives live status from a live snapshot with surface", () => {
    const model = deriveWorldOverlayModel(makeLiveSnapshot());
    expect(model.status).toBe("live");
    expect(model.evidence.serverTick).toBe(42);
    expect(model.worldSurfaceTick).toBe(7);
  });

  it("reports waiting status when snapshot is waiting", () => {
    const model = deriveWorldOverlayModel(
      makeLiveSnapshot({ status: "waiting" } as Partial<LiveGameplaySnapshot>),
    );
    expect(model.status).toBe("waiting");
  });

  it("reports stale status when snapshot is stale", () => {
    const model = deriveWorldOverlayModel(
      makeLiveSnapshot({ status: "stale" } as Partial<LiveGameplaySnapshot>),
    );
    expect(model.status).toBe("stale");
  });

  it("projects and stably sorts POIs", () => {
    const model = deriveWorldOverlayModel(
      makeLiveSnapshot({
        worldPois: [
          { poiId: "poi_b", type: "logging_camp", title: "B Camp", x: 2, y: 3, chunkX: 0, chunkZ: 0, discovered: true },
          { poiId: "poi_a", type: "mining_camp", title: "A Camp", x: 1, y: 4, chunkX: 0, chunkZ: 0, discovered: false },
        ],
      }),
    );
    expect(model.pois).toHaveLength(2);
    expect(model.pois[0].poiId).toBe("poi_a");
    expect(model.pois[1].poiId).toBe("poi_b");
    expect(model.pois[0].discovered).toBe(false);
    expect(model.pois[1].discovered).toBe(true);
    expect(model.evidence.poiCount).toBe(2);
  });

  it("projects and stably sorts resource nodes, filtering invalid kinds", () => {
    const model = deriveWorldOverlayModel(
      makeLiveSnapshot({
        resources: [
          { id: "res_b", kind: "ore", title: "Iron", skillId: "mining", position: { x: 5, y: 6 }, radius: 16, status: "available", requiredLevel: 1, xpReward: 10, itemRewardId: "iron", itemRewardName: "Iron", depletedUntilTick: null, remainingTicks: 0 },
          { id: "res_a", kind: "tree", title: "Oak", skillId: "woodcutting", position: { x: 1, y: 2 }, radius: 16, status: "depleted", requiredLevel: 1, xpReward: 5, itemRewardId: "oak", itemRewardName: "Oak", depletedUntilTick: 99, remainingTicks: 3 },
          { id: "res_c", kind: "invalid" as any, title: "Bad", skillId: "woodcutting", position: { x: 0, y: 0 }, radius: 16, status: "available", requiredLevel: 1, xpReward: 0, itemRewardId: "bad", itemRewardName: "Bad", depletedUntilTick: null, remainingTicks: 0 },
        ],
      }),
    );
    expect(model.resourceNodes).toHaveLength(2);
    expect(model.resourceNodes[0].id).toBe("res_a");
    expect(model.resourceNodes[1].id).toBe("res_b");
    expect(model.resourceNodes[0].status).toBe("depleted");
    expect(model.evidence.resourceCount).toBe(2);
  });

  it("projects and stably sorts camp NPCs, filtering invalid types", () => {
    const model = deriveWorldOverlayModel(
      makeLiveSnapshot({
        campNpcs: [
          { id: "npc_b", type: "camp_miner", name: "Miner Bob", role: "Miner", poiId: "poi_1", position: { x: 3, y: 4 }, state: "working", activity: "gathering", activityMessage: "" },
          { id: "npc_a", type: "camp_woodcutter", name: "Wood Alice", role: "Cutter", poiId: "poi_2", position: { x: 1, y: 2 }, state: "idle", activity: "returning", activityMessage: "" },
          { id: "npc_c", type: "invalid" as any, name: "Bad", role: "X", poiId: "poi_3", position: { x: 0, y: 0 }, state: "idle", activity: "gathering", activityMessage: "" },
        ],
      }),
    );
    expect(model.campNpcs).toHaveLength(2);
    expect(model.campNpcs[0].id).toBe("npc_a");
    expect(model.campNpcs[1].id).toBe("npc_b");
    expect(model.evidence.campNpcCount).toBe(2);
  });

  it("projects surface groups and points from worldSurface", () => {
    const model = deriveWorldOverlayModel(
      makeLiveSnapshot({
        worldSurface: {
          schemaVersion: WORLD_SURFACE_SCHEMA_VERSION,
          tick: 11,
          groups: [{ id: "house_2", title: "Cottage" }, { id: "house_1", title: "Manor" }],
          points: [{ id: "node_b", x: 5, y: 6 }, { id: "node_a", x: 1, y: 2 }],
        },
      }),
    );
    expect(model.surfaceGroups).toHaveLength(2);
    expect(model.surfaceGroups[0].id).toBe("house_1");
    expect(model.surfaceGroups[1].id).toBe("house_2");
    expect(model.surfacePoints).toHaveLength(2);
    expect(model.surfacePoints[0].id).toBe("node_a");
    expect(model.surfacePoints[1].id).toBe("node_b");
    expect(model.worldSurfaceTick).toBe(11);
    expect(model.evidence.surfaceGroupCount).toBe(2);
    expect(model.evidence.surfacePointCount).toBe(2);
  });

  it("produces a frozen, immutable model", () => {
    const model: WorldOverlayModel = deriveWorldOverlayModel(makeLiveSnapshot());
    expect(Object.isFrozen(model)).toBe(true);
    expect(Object.isFrozen(model.pois)).toBe(true);
    expect(Object.isFrozen(model.resourceNodes)).toBe(true);
    expect(Object.isFrozen(model.campNpcs)).toBe(true);
    expect(Object.isFrozen(model.evidence)).toBe(true);
  });

  it("reports empty status when snapshot is empty and has no overlay entries", () => {
    const model = deriveWorldOverlayModel(makeLiveSnapshot({ status: "empty" }));
    expect(model.status).toBe("empty");
  });
});
