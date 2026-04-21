/**
 * Placement Rules — configurable parameters for the WorldPlacementRuleEngine.
 * All distances in world units. All angles in radians.
 */

export interface PlacementRules {
  // Building spacing
  minHouseToHouseDistance: number;
  minHouseToRoadDistance: number;
  requireRoadBetweenBuildingBands: boolean;
  maxBuildingsPerChunk: number;

  // Gates and walls
  minGateClearance: number;
  wallSnapTolerance: number;
  roadSnapTolerance: number;
  maxWallGapDistance: number;

  // Roads
  maxSlopeForRoad: number;
  roadConnectionTolerance: number;
  requireRoadContinuity: boolean;

  // Dungeons
  dungeonMinDistanceFromSettlement: number;
  dungeonMinDistanceFromOtherDungeon: number;

  // Vegetation
  treeExclusionBufferNearRoad: number;
  treeExclusionBufferNearHouse: number;
  treeExclusionBufferNearWall: number;
  treeExclusionBufferNearGate: number;
  minTreeSpacing: number;

  // Terrain
  maxSlopeForHouse: number;
  maxSlopeForWall: number;
  maxSlopeForProp: number;
  terrainFlatteningPadding: number;
  terrainFlatteningResolution: number;

  // NavMesh
  navObstaclePadding: number;
  navWalkableSlope: number;
  navAgentRadius: number;
  navAgentHeight: number;

  // Streaming
  streamRegistrationRadiusByAssetType: Record<string, number>;
  defaultStreamRadius: number;

  // Performance
  thinInstanceEligibleTypes: string[];
  maxThinInstancesPerMesh: number;

  // Debug
  debugShowFootprints: boolean;
  debugShowClearance: boolean;
  debugShowNavDirty: boolean;
  debugShowVegExclusion: boolean;
  debugShowRejected: boolean;
}

export const DEFAULT_PLACEMENT_RULES: PlacementRules = {
  minHouseToHouseDistance: 3,
  minHouseToRoadDistance: 2,
  requireRoadBetweenBuildingBands: false,
  maxBuildingsPerChunk: 20,

  minGateClearance: 4,
  wallSnapTolerance: 1.5,
  roadSnapTolerance: 3,
  maxWallGapDistance: 5,

  maxSlopeForRoad: 0.175, // ~10 deg
  roadConnectionTolerance: 4,
  requireRoadContinuity: true,

  dungeonMinDistanceFromSettlement: 65,
  dungeonMinDistanceFromOtherDungeon: 40,

  treeExclusionBufferNearRoad: 2.5,
  treeExclusionBufferNearHouse: 5,
  treeExclusionBufferNearWall: 2,
  treeExclusionBufferNearGate: 4,
  minTreeSpacing: 3,

  maxSlopeForHouse: 0.087, // ~5 deg
  maxSlopeForWall: 0.087,
  maxSlopeForProp: 0.26, // ~15 deg
  terrainFlatteningPadding: 2,
  terrainFlatteningResolution: 8,

  navObstaclePadding: 0.5,
  navWalkableSlope: 0.35, // ~20 deg
  navAgentRadius: 0.5,
  navAgentHeight: 1.8,

  streamRegistrationRadiusByAssetType: {
    buildings: 80,
    roads: 60,
    walls: 60,
    dungeons: 100,
    vegetation: 50,
    props: 40,
    spawns: 60,
    resources: 50,
    poi: 70,
    infrastructure: 60,
    landmarks: 100,
  },
  defaultStreamRadius: 50,

  thinInstanceEligibleTypes: [
    "lamp_post", "decorative_statue", "fence", "road_straight",
    "city_wall_segment", "foliage_prop", "prop_generic", "market_stall",
  ],
  maxThinInstancesPerMesh: 5000,

  debugShowFootprints: false,
  debugShowClearance: false,
  debugShowNavDirty: false,
  debugShowVegExclusion: false,
  debugShowRejected: false,
};

/** Merge user overrides with defaults. */
export function resolvePlacementRules(overrides?: Partial<PlacementRules>): PlacementRules {
  return { ...DEFAULT_PLACEMENT_RULES, ...overrides };
}
