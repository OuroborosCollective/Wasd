// @ts-nocheck
/**
 * Asset Profiles — classify every GLB asset for the placement pipeline.
 * Each profile drives footprint, clearance, physics, nav, streaming, and vegetation rules.
 */

export type AssetCategory =
  | "house_small" | "house_large" | "castle" | "tower" | "market"
  | "road_straight" | "road_curve" | "road_intersection"
  | "city_wall_segment" | "city_gate" | "fence"
  | "dungeon_entrance" | "bridge_small" | "bridge_large"
  | "decorative_statue" | "lamp_post" | "well" | "market_stall"
  | "tree_blocker" | "foliage_prop"
  | "npc_spawn" | "resource_node" | "poi_marker"
  | "prop_generic" | "unknown";

export type ColliderType = "none" | "box" | "mesh" | "convex" | "cylinder";
export type InstancingStrategy = "unique" | "instance" | "thin_instance";
export type NavImpact = "none" | "obstacle" | "walkable" | "dynamic_gate";

export interface AssetProfile {
  category: AssetCategory;
  footprintWidth: number;
  footprintDepth: number;
  footprintHeight: number;
  clearanceRadius: number;
  minSpacing: number;
  allowedSlope: number; // radians
  requiresFlattening: boolean;
  flatteningPadding: number;
  colliderType: ColliderType;
  navImpact: NavImpact;
  navObstaclePadding: number;
  canUseThinInstances: boolean;
  instancingStrategy: InstancingStrategy;
  vegetationExclusionRadius: number;
  streamGroup: string;
  placementPriority: number; // lower = placed first
  requiresRoadAccess: boolean;
  doorwaySide?: "north" | "south" | "east" | "west";
  allowedRotations: number[]; // radians, empty = any
  isDestructible: boolean;
  labelPolicy?: "name" | "none";
  snapToWall: boolean;
  snapToRoad: boolean;
  roadSnapTolerance: number;
  wallSnapTolerance: number;
}

const DEG = (d: number) => (d * Math.PI) / 180;

const BASE_PROFILES: Record<string, AssetProfile> = {
  house_small: {
    category: "house_small", footprintWidth: 6, footprintDepth: 6, footprintHeight: 5,
    clearanceRadius: 4, minSpacing: 3, allowedSlope: DEG(5), requiresFlattening: true,
    flatteningPadding: 2, colliderType: "box", navImpact: "obstacle", navObstaclePadding: 1,
    canUseThinInstances: false, instancingStrategy: "unique", vegetationExclusionRadius: 5,
    streamGroup: "buildings", placementPriority: 10, requiresRoadAccess: true,
    doorwaySide: "south", allowedRotations: [0, DEG(90), DEG(180), DEG(270)],
    isDestructible: false, labelPolicy: "name", snapToWall: false, snapToRoad: false,
    roadSnapTolerance: 15, wallSnapTolerance: 0,
  },
  house_large: {
    category: "house_large", footprintWidth: 10, footprintDepth: 10, footprintHeight: 7,
    clearanceRadius: 6, minSpacing: 5, allowedSlope: DEG(4), requiresFlattening: true,
    flatteningPadding: 3, colliderType: "box", navImpact: "obstacle", navObstaclePadding: 1.5,
    canUseThinInstances: false, instancingStrategy: "unique", vegetationExclusionRadius: 8,
    streamGroup: "buildings", placementPriority: 10, requiresRoadAccess: true,
    doorwaySide: "south", allowedRotations: [0, DEG(90), DEG(180), DEG(270)],
    isDestructible: false, labelPolicy: "name", snapToWall: false, snapToRoad: false,
    roadSnapTolerance: 20, wallSnapTolerance: 0,
  },
  castle: {
    category: "castle", footprintWidth: 20, footprintDepth: 20, footprintHeight: 15,
    clearanceRadius: 12, minSpacing: 10, allowedSlope: DEG(3), requiresFlattening: true,
    flatteningPadding: 5, colliderType: "mesh", navImpact: "obstacle", navObstaclePadding: 2,
    canUseThinInstances: false, instancingStrategy: "unique", vegetationExclusionRadius: 15,
    streamGroup: "landmarks", placementPriority: 5, requiresRoadAccess: true,
    allowedRotations: [], isDestructible: false, labelPolicy: "name",
    snapToWall: false, snapToRoad: false, roadSnapTolerance: 25, wallSnapTolerance: 0,
  },
  tower: {
    category: "tower", footprintWidth: 5, footprintDepth: 5, footprintHeight: 12,
    clearanceRadius: 3.5, minSpacing: 3, allowedSlope: DEG(5), requiresFlattening: true,
    flatteningPadding: 1, colliderType: "box", navImpact: "obstacle", navObstaclePadding: 0.5,
    canUseThinInstances: false, instancingStrategy: "unique", vegetationExclusionRadius: 4,
    streamGroup: "buildings", placementPriority: 15, requiresRoadAccess: false,
    allowedRotations: [], isDestructible: false, labelPolicy: "name",
    snapToWall: true, snapToRoad: false, roadSnapTolerance: 0, wallSnapTolerance: 3,
  },
  market: {
    category: "market", footprintWidth: 12, footprintDepth: 8, footprintHeight: 4,
    clearanceRadius: 7, minSpacing: 4, allowedSlope: DEG(3), requiresFlattening: true,
    flatteningPadding: 3, colliderType: "box", navImpact: "obstacle", navObstaclePadding: 1,
    canUseThinInstances: false, instancingStrategy: "unique", vegetationExclusionRadius: 8,
    streamGroup: "buildings", placementPriority: 12, requiresRoadAccess: true,
    doorwaySide: "south", allowedRotations: [0, DEG(90), DEG(180), DEG(270)],
    isDestructible: false, labelPolicy: "name", snapToWall: false, snapToRoad: true,
    roadSnapTolerance: 10, wallSnapTolerance: 0,
  },
  road_straight: {
    category: "road_straight", footprintWidth: 4, footprintDepth: 16, footprintHeight: 0.2,
    clearanceRadius: 2.5, minSpacing: 0, allowedSlope: DEG(10), requiresFlattening: false,
    flatteningPadding: 1, colliderType: "none", navImpact: "walkable", navObstaclePadding: 0,
    canUseThinInstances: true, instancingStrategy: "thin_instance", vegetationExclusionRadius: 2.5,
    streamGroup: "roads", placementPriority: 20, requiresRoadAccess: false,
    allowedRotations: [0, DEG(90), DEG(180), DEG(270)], isDestructible: false,
    snapToWall: false, snapToRoad: true, roadSnapTolerance: 2, wallSnapTolerance: 0,
  },
  road_curve: {
    category: "road_curve", footprintWidth: 8, footprintDepth: 8, footprintHeight: 0.2,
    clearanceRadius: 5, minSpacing: 0, allowedSlope: DEG(10), requiresFlattening: false,
    flatteningPadding: 1, colliderType: "none", navImpact: "walkable", navObstaclePadding: 0,
    canUseThinInstances: false, instancingStrategy: "unique", vegetationExclusionRadius: 2.5,
    streamGroup: "roads", placementPriority: 20, requiresRoadAccess: false,
    allowedRotations: [], isDestructible: false, snapToWall: false, snapToRoad: true,
    roadSnapTolerance: 2, wallSnapTolerance: 0,
  },
  road_intersection: {
    category: "road_intersection", footprintWidth: 8, footprintDepth: 8, footprintHeight: 0.2,
    clearanceRadius: 5, minSpacing: 0, allowedSlope: DEG(8), requiresFlattening: false,
    flatteningPadding: 1, colliderType: "none", navImpact: "walkable", navObstaclePadding: 0,
    canUseThinInstances: false, instancingStrategy: "unique", vegetationExclusionRadius: 3,
    streamGroup: "roads", placementPriority: 19, requiresRoadAccess: false,
    allowedRotations: [], isDestructible: false, snapToWall: false, snapToRoad: false,
    roadSnapTolerance: 2, wallSnapTolerance: 0,
  },
  city_wall_segment: {
    category: "city_wall_segment", footprintWidth: 2, footprintDepth: 10, footprintHeight: 6,
    clearanceRadius: 1.5, minSpacing: 0, allowedSlope: DEG(5), requiresFlattening: true,
    flatteningPadding: 1, colliderType: "box", navImpact: "obstacle", navObstaclePadding: 0.5,
    canUseThinInstances: true, instancingStrategy: "thin_instance", vegetationExclusionRadius: 2,
    streamGroup: "walls", placementPriority: 15, requiresRoadAccess: false,
    allowedRotations: [0, DEG(90), DEG(180), DEG(270)], isDestructible: false,
    snapToWall: true, snapToRoad: false, roadSnapTolerance: 0, wallSnapTolerance: 1,
  },
  city_gate: {
    category: "city_gate", footprintWidth: 4, footprintDepth: 6, footprintHeight: 7,
    clearanceRadius: 3, minSpacing: 2, allowedSlope: DEG(3), requiresFlattening: true,
    flatteningPadding: 2, colliderType: "box", navImpact: "dynamic_gate", navObstaclePadding: 0.5,
    canUseThinInstances: false, instancingStrategy: "unique", vegetationExclusionRadius: 4,
    streamGroup: "walls", placementPriority: 14, requiresRoadAccess: true,
    doorwaySide: "south", allowedRotations: [0, DEG(90), DEG(180), DEG(270)],
    isDestructible: false, labelPolicy: "name", snapToWall: true, snapToRoad: true,
    roadSnapTolerance: 5, wallSnapTolerance: 1,
  },
  fence: {
    category: "fence", footprintWidth: 1, footprintDepth: 6, footprintHeight: 1.5,
    clearanceRadius: 1, minSpacing: 0, allowedSlope: DEG(10), requiresFlattening: false,
    flatteningPadding: 0, colliderType: "box", navImpact: "obstacle", navObstaclePadding: 0.3,
    canUseThinInstances: true, instancingStrategy: "thin_instance", vegetationExclusionRadius: 1,
    streamGroup: "props", placementPriority: 30, requiresRoadAccess: false,
    allowedRotations: [0, DEG(90), DEG(180), DEG(270)], isDestructible: true,
    snapToWall: false, snapToRoad: false, roadSnapTolerance: 0, wallSnapTolerance: 0,
  },
  dungeon_entrance: {
    category: "dungeon_entrance", footprintWidth: 8, footprintDepth: 8, footprintHeight: 6,
    clearanceRadius: 6, minSpacing: 8, allowedSlope: DEG(5), requiresFlattening: true,
    flatteningPadding: 3, colliderType: "box", navImpact: "walkable", navObstaclePadding: 1,
    canUseThinInstances: false, instancingStrategy: "unique", vegetationExclusionRadius: 6,
    streamGroup: "dungeons", placementPriority: 8, requiresRoadAccess: false,
    doorwaySide: "south", allowedRotations: [], isDestructible: false, labelPolicy: "name",
    snapToWall: false, snapToRoad: false, roadSnapTolerance: 0, wallSnapTolerance: 0,
  },
  bridge_small: {
    category: "bridge_small", footprintWidth: 4, footprintDepth: 12, footprintHeight: 3,
    clearanceRadius: 3, minSpacing: 2, allowedSlope: DEG(8), requiresFlattening: false,
    flatteningPadding: 1, colliderType: "box", navImpact: "walkable", navObstaclePadding: 0.5,
    canUseThinInstances: false, instancingStrategy: "unique", vegetationExclusionRadius: 3,
    streamGroup: "infrastructure", placementPriority: 18, requiresRoadAccess: true,
    allowedRotations: [0, DEG(90), DEG(180), DEG(270)], isDestructible: false,
    snapToWall: false, snapToRoad: true, roadSnapTolerance: 5, wallSnapTolerance: 0,
  },
  decorative_statue: {
    category: "decorative_statue", footprintWidth: 2, footprintDepth: 2, footprintHeight: 4,
    clearanceRadius: 1.5, minSpacing: 2, allowedSlope: DEG(8), requiresFlattening: false,
    flatteningPadding: 0, colliderType: "cylinder", navImpact: "obstacle", navObstaclePadding: 0.5,
    canUseThinInstances: true, instancingStrategy: "thin_instance", vegetationExclusionRadius: 1.5,
    streamGroup: "props", placementPriority: 40, requiresRoadAccess: false,
    allowedRotations: [], isDestructible: true, snapToWall: false, snapToRoad: false,
    roadSnapTolerance: 0, wallSnapTolerance: 0,
  },
  lamp_post: {
    category: "lamp_post", footprintWidth: 1, footprintDepth: 1, footprintHeight: 4,
    clearanceRadius: 0.8, minSpacing: 3, allowedSlope: DEG(10), requiresFlattening: false,
    flatteningPadding: 0, colliderType: "cylinder", navImpact: "obstacle", navObstaclePadding: 0.3,
    canUseThinInstances: true, instancingStrategy: "thin_instance", vegetationExclusionRadius: 1,
    streamGroup: "props", placementPriority: 35, requiresRoadAccess: false,
    allowedRotations: [], isDestructible: true, snapToWall: false, snapToRoad: true,
    roadSnapTolerance: 3, wallSnapTolerance: 0,
  },
  well: {
    category: "well", footprintWidth: 3, footprintDepth: 3, footprintHeight: 2,
    clearanceRadius: 2, minSpacing: 3, allowedSlope: DEG(5), requiresFlattening: true,
    flatteningPadding: 1, colliderType: "cylinder", navImpact: "obstacle", navObstaclePadding: 0.5,
    canUseThinInstances: false, instancingStrategy: "unique", vegetationExclusionRadius: 2,
    streamGroup: "props", placementPriority: 25, requiresRoadAccess: false,
    allowedRotations: [], isDestructible: false, labelPolicy: "name",
    snapToWall: false, snapToRoad: false, roadSnapTolerance: 0, wallSnapTolerance: 0,
  },
  market_stall: {
    category: "market_stall", footprintWidth: 4, footprintDepth: 3, footprintHeight: 3,
    clearanceRadius: 2.5, minSpacing: 2, allowedSlope: DEG(5), requiresFlattening: true,
    flatteningPadding: 1, colliderType: "box", navImpact: "obstacle", navObstaclePadding: 0.5,
    canUseThinInstances: true, instancingStrategy: "instance", vegetationExclusionRadius: 2,
    streamGroup: "props", placementPriority: 28, requiresRoadAccess: true,
    allowedRotations: [0, DEG(90), DEG(180), DEG(270)], isDestructible: true,
    snapToWall: false, snapToRoad: true, roadSnapTolerance: 8, wallSnapTolerance: 0,
  },
  tree_blocker: {
    category: "tree_blocker", footprintWidth: 2, footprintDepth: 2, footprintHeight: 8,
    clearanceRadius: 1.5, minSpacing: 3, allowedSlope: DEG(20), requiresFlattening: false,
    flatteningPadding: 0, colliderType: "cylinder", navImpact: "obstacle", navObstaclePadding: 0.5,
    canUseThinInstances: false, instancingStrategy: "unique", vegetationExclusionRadius: 0,
    streamGroup: "vegetation", placementPriority: 50, requiresRoadAccess: false,
    allowedRotations: [], isDestructible: true, snapToWall: false, snapToRoad: false,
    roadSnapTolerance: 0, wallSnapTolerance: 0,
  },
  foliage_prop: {
    category: "foliage_prop", footprintWidth: 1.5, footprintDepth: 1.5, footprintHeight: 2,
    clearanceRadius: 1, minSpacing: 1, allowedSlope: DEG(20), requiresFlattening: false,
    flatteningPadding: 0, colliderType: "none", navImpact: "none", navObstaclePadding: 0,
    canUseThinInstances: true, instancingStrategy: "thin_instance", vegetationExclusionRadius: 0,
    streamGroup: "vegetation", placementPriority: 55, requiresRoadAccess: false,
    allowedRotations: [], isDestructible: true, snapToWall: false, snapToRoad: false,
    roadSnapTolerance: 0, wallSnapTolerance: 0,
  },
  npc_spawn: {
    category: "npc_spawn", footprintWidth: 1, footprintDepth: 1, footprintHeight: 2,
    clearanceRadius: 1, minSpacing: 3, allowedSlope: DEG(15), requiresFlattening: false,
    flatteningPadding: 0, colliderType: "none", navImpact: "none", navObstaclePadding: 0,
    canUseThinInstances: false, instancingStrategy: "unique", vegetationExclusionRadius: 0,
    streamGroup: "spawns", placementPriority: 60, requiresRoadAccess: false,
    allowedRotations: [], isDestructible: false, labelPolicy: "name",
    snapToWall: false, snapToRoad: false, roadSnapTolerance: 0, wallSnapTolerance: 0,
  },
  resource_node: {
    category: "resource_node", footprintWidth: 2, footprintDepth: 2, footprintHeight: 2,
    clearanceRadius: 1.5, minSpacing: 5, allowedSlope: DEG(15), requiresFlattening: false,
    flatteningPadding: 0, colliderType: "cylinder", navImpact: "obstacle", navObstaclePadding: 0.3,
    canUseThinInstances: false, instancingStrategy: "unique", vegetationExclusionRadius: 1,
    streamGroup: "resources", placementPriority: 45, requiresRoadAccess: false,
    allowedRotations: [], isDestructible: true, labelPolicy: "name",
    snapToWall: false, snapToRoad: false, roadSnapTolerance: 0, wallSnapTolerance: 0,
  },
  poi_marker: {
    category: "poi_marker", footprintWidth: 2, footprintDepth: 2, footprintHeight: 3,
    clearanceRadius: 1.5, minSpacing: 5, allowedSlope: DEG(10), requiresFlattening: false,
    flatteningPadding: 0, colliderType: "none", navImpact: "none", navObstaclePadding: 0,
    canUseThinInstances: false, instancingStrategy: "unique", vegetationExclusionRadius: 2,
    streamGroup: "poi", placementPriority: 30, requiresRoadAccess: false,
    allowedRotations: [], isDestructible: false, labelPolicy: "name",
    snapToWall: false, snapToRoad: false, roadSnapTolerance: 0, wallSnapTolerance: 0,
  },
  prop_generic: {
    category: "prop_generic", footprintWidth: 2, footprintDepth: 2, footprintHeight: 2,
    clearanceRadius: 1.5, minSpacing: 1, allowedSlope: DEG(15), requiresFlattening: false,
    flatteningPadding: 0, colliderType: "box", navImpact: "obstacle", navObstaclePadding: 0.3,
    canUseThinInstances: true, instancingStrategy: "thin_instance", vegetationExclusionRadius: 1,
    streamGroup: "props", placementPriority: 50, requiresRoadAccess: false,
    allowedRotations: [], isDestructible: true, snapToWall: false, snapToRoad: false,
    roadSnapTolerance: 0, wallSnapTolerance: 0,
  },
  unknown: {
    category: "unknown", footprintWidth: 3, footprintDepth: 3, footprintHeight: 3,
    clearanceRadius: 2, minSpacing: 2, allowedSlope: DEG(10), requiresFlattening: false,
    flatteningPadding: 0, colliderType: "box", navImpact: "obstacle", navObstaclePadding: 0.5,
    canUseThinInstances: false, instancingStrategy: "unique", vegetationExclusionRadius: 1,
    streamGroup: "props", placementPriority: 99, requiresRoadAccess: false,
    allowedRotations: [], isDestructible: true, snapToWall: false, snapToRoad: false,
    roadSnapTolerance: 0, wallSnapTolerance: 0,
  },
};

/** Resolve an asset profile by category name. Returns 'unknown' fallback. */
export function getAssetProfile(category: string): AssetProfile {
  return BASE_PROFILES[category] ?? BASE_PROFILES.unknown;
}

/** Resolve asset profile from asset path heuristics (filename prefix matching). */
export function resolveProfileFromPath(assetPath: string): AssetProfile {
  const lower = assetPath.toLowerCase();
  const prefixMap: [string, AssetCategory][] = [
    ["house_large", "house_large"],
    ["house_small", "house_small"],
    ["house_", "house_small"],
    ["castle", "castle"],
    ["tower", "tower"],
    ["market_stall", "market_stall"],
    ["market", "market"],
    ["road_intersection", "road_intersection"],
    ["road_curve", "road_curve"],
    ["road_", "road_straight"],
    ["city_wall", "city_wall_segment"],
    ["wall_", "city_wall_segment"],
    ["city_gate", "city_gate"],
    ["gate_", "city_gate"],
    ["fence", "fence"],
    ["dungeon", "dungeon_entrance"],
    ["bridge", "bridge_small"],
    ["statue", "decorative_statue"],
    ["lamp", "lamp_post"],
    ["well", "well"],
    ["stall", "market_stall"],
    ["foliage", "foliage_prop"],
    ["tree_", "tree_blocker"],
    ["npc_spawn", "npc_spawn"],
    ["spawn_", "npc_spawn"],
    ["resource", "resource_node"],
    ["ore_", "resource_node"],
    ["poi_", "poi_marker"],
  ];
  for (const [prefix, category] of prefixMap) {
    if (lower.includes(prefix)) return getAssetProfile(category);
  }
  return getAssetProfile("unknown");
}

/** Resolve profile from GLB mesh metadata or child node names. */
export function resolveProfileFromMetadata(
  meshNames: string[],
  boundingBox: { width: number; depth: number; height: number }
): AssetProfile {
  const names = meshNames.join(" ").toLowerCase();

  // Check mesh names for hints
  if (names.includes("house") || names.includes("building")) {
    const area = boundingBox.width * boundingBox.depth;
    return getAssetProfile(area > 80 ? "house_large" : "house_small");
  }
  if (names.includes("wall")) return getAssetProfile("city_wall_segment");
  if (names.includes("gate")) return getAssetProfile("city_gate");
  if (names.includes("road") || names.includes("path")) return getAssetProfile("road_straight");
  if (names.includes("tree")) return getAssetProfile("tree_blocker");
  if (names.includes("dungeon")) return getAssetProfile("dungeon_entrance");
  if (names.includes("bridge")) return getAssetProfile("bridge_small");
  if (names.includes("lamp") || names.includes("light")) return getAssetProfile("lamp_post");
  if (names.includes("well")) return getAssetProfile("well");
  if (names.includes("npc") || names.includes("spawn")) return getAssetProfile("npc_spawn");

  // Size-based heuristics
  if (boundingBox.height > 8 && boundingBox.width < 3) return getAssetProfile("tree_blocker");
  if (boundingBox.height < 1 && boundingBox.width > 10) return getAssetProfile("road_straight");
  if (boundingBox.width > 8 && boundingBox.depth > 8) return getAssetProfile("house_large");

  return getAssetProfile("unknown");
}

/** Get all registered categories. */
export function getAllCategories(): AssetCategory[] {
  return Object.keys(BASE_PROFILES) as AssetCategory[];
}

/** Get all profiles with a specific instancing strategy. */
export function getProfilesByStrategy(strategy: InstancingStrategy): AssetProfile[] {
  return Object.values(BASE_PROFILES).filter((p) => p.instancingStrategy === strategy);
}
