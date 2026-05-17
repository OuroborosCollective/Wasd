/**
 * Deterministic logical village layout: central street, paired houses, well, trees.
 * Model paths are resolved via GLBRegistry + AssetPoolResolver with explicit fallbacks.
 */

import type { GLBRegistry } from "../../modules/asset-registry/GLBRegistry.js";
import type { AssetPoolResolver } from "../../modules/world/AssetPoolResolver.js";
import { ensureGlbUrl } from "../../modules/asset-registry/builtinModelFallbacks.js";

export type LogicalVillageEntity = {
  id: string;
  type: "object";
  name: string;
  role: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  modelUrl: string;
  visible: boolean;
  modelVersion: number;
};

export type LogicalVillageResult = {
  entities: LogicalVillageEntity[];
  /** Human-readable list of pool keys / filenames the generator relied on */
  usedModelKeys: string[];
  /** Pool keys that had no resolved file (caller may cross-check disk) */
  missingHints: string[];
};

export type LogicalVillageOptions = {
  centerX: number;
  centerZ: number;
  /** Stable string for deterministic variant picks (e.g. prompt or admin id) */
  seed: string;
  /** Houses per side of the main street */
  housesPerSide?: number;
  /** Spacing along street axis between house centers */
  houseStride?: number;
  /** Lateral offset from street centerline to house facades */
  laneWidth?: number;
  layoutRevision?: number;
};

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function resolveHouse(
  glb: GLBRegistry,
  pools: AssetPoolResolver,
  seed: string,
): { url: string; key: string } {
  const keys: Array<[string, string]> = [
    ["world_object", "house_small"],
    ["object_group", "house"],
  ];
  for (const [tt, tid] of keys) {
    const u = glb.getModelForTarget(tt, tid);
    if (u && u.trim()) return { url: u.trim(), key: `${tt}:${tid}` };
  }
  const pooled = pools.resolvePath("world_objects", "house", seed);
  if (pooled && pooled.trim()) return { url: pooled.trim(), key: "pool:world_objects:house" };
  return { url: ensureGlbUrl("object", null), key: "builtin:object" };
}

function resolveRoad(pools: AssetPoolResolver, seed: string): { url: string; key: string } {
  const pooled = pools.resolvePath("world_objects", "road", seed);
  if (pooled && pooled.trim()) return { url: pooled.trim(), key: "pool:world_objects:road" };
  return { url: ensureGlbUrl("object", null), key: "builtin:object" };
}

function resolveWell(pools: AssetPoolResolver, seed: string): { url: string; key: string } {
  const pooled = pools.resolvePath("world_objects", "well", seed);
  if (pooled && pooled.trim()) return { url: pooled.trim(), key: "pool:world_objects:well" };
  return { url: ensureGlbUrl("object", null), key: "builtin:object" };
}

function resolveTree(pools: AssetPoolResolver, seed: string): { url: string; key: string } {
  const pooled = pools.resolvePath("world_objects", "tree", seed);
  if (pooled && pooled.trim()) return { url: pooled.trim(), key: "pool:world_objects:tree" };
  return { url: ensureGlbUrl("object", null), key: "builtin:object" };
}

/**
 * Builds a compact orthogonal village: main street on +X, houses on ±Z, well at origin offset.
 */
export function generateLogicalVillage(
  glb: GLBRegistry,
  pools: AssetPoolResolver,
  options: LogicalVillageOptions,
): LogicalVillageResult {
  const housesPerSide = Math.max(2, Math.min(12, options.housesPerSide ?? 4));
  const stride = options.houseStride ?? 14;
  const lane = options.laneWidth ?? 9;
  const cx = options.centerX;
  const cz = options.centerZ;
  const seed = options.seed || "village";
  const rev = options.layoutRevision ?? 1;
  const h0 = hashSeed(seed);

  const usedModelKeys: string[] = [];
  const missingHints: string[] = [];

  const house = resolveHouse(glb, pools, `${seed}:house`);
  const road = resolveRoad(pools, `${seed}:road`);
  const well = resolveWell(pools, `${seed}:well`);
  const tree = resolveTree(pools, `${seed}:tree`);

  usedModelKeys.push(house.key, road.key, well.key, tree.key);
  if (house.key.startsWith("builtin")) missingHints.push("house");
  if (road.key.startsWith("builtin")) missingHints.push("road");
  if (well.key.startsWith("builtin")) missingHints.push("well");
  if (tree.key.startsWith("builtin")) missingHints.push("tree");

  const entities: LogicalVillageEntity[] = [];
  let idx = 0;

  const push = (partial: Omit<LogicalVillageEntity, "type" | "visible" | "modelVersion">) => {
    entities.push({
      type: "object",
      visible: true,
      modelVersion: rev,
      ...partial,
    });
    idx += 1;
  };

  const streetLen = stride * (housesPerSide + 1);
  const roadCount = Math.max(3, Math.floor(streetLen / 6));
  for (let r = 0; r < roadCount; r++) {
    const t = r / Math.max(1, roadCount - 1);
    const x = cx - streetLen / 2 + t * streetLen;
    push({
      id: `vlg_road_${h0}_${r}`,
      name: "Village Road",
      role: "road",
      position: { x, y: 0, z: cz },
      rotation: { x: 0, y: 0, z: 0 },
      modelUrl: road.url,
    });
  }

  for (let i = 0; i < housesPerSide; i++) {
    const along = (i - (housesPerSide - 1) / 2) * stride;
    const yawA = 90;
    const yawB = -90;
    push({
      id: `vlg_house_n_${h0}_${i}`,
      name: `Village House N${i + 1}`,
      role: "house",
      position: { x: cx + along, y: 0, z: cz - lane },
      rotation: { x: 0, y: yawA, z: 0 },
      modelUrl: house.url,
    });
    push({
      id: `vlg_house_s_${h0}_${i}`,
      name: `Village House S${i + 1}`,
      role: "house",
      position: { x: cx + along, y: 0, z: cz + lane },
      rotation: { x: 0, y: yawB, z: 0 },
      modelUrl: house.url,
    });
  }

  push({
    id: `vlg_well_${h0}`,
    name: "Village Well",
    role: "well",
    position: { x: cx + stride * 0.35, y: 0, z: cz },
    rotation: { x: 0, y: (h0 % 360) * 0.25, z: 0 },
    modelUrl: well.url,
  });

  const treeRing = lane + 16 + (h0 % 5);
  const treeDirs = [
    { x: 1, z: 0 },
    { x: -1, z: 0 },
    { x: 0, z: 1 },
    { x: 0, z: -1 },
    { x: 1, z: 1 },
    { x: -1, z: 1 },
  ];
  for (let t = 0; t < treeDirs.length; t++) {
    const d = treeDirs[t]!;
    push({
      id: `vlg_tree_${h0}_${t}`,
      name: "Village Tree",
      role: "tree",
      position: {
        x: cx + d.x * treeRing + (t % 2) * 2,
        y: 0,
        z: cz + d.z * treeRing + (t % 3),
      },
      rotation: { x: 0, y: (h0 + t * 47) % 360, z: 0 },
      modelUrl: tree.url,
    });
  }

  return { entities, usedModelKeys, missingHints };
}
