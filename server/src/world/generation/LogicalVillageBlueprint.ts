import type { WorldObject } from "../../modules/world/WorldObjectSystem.js";

export type LogicalVillageBlueprintOptions = {
  /** Stable id prefix for spawned objects (e.g. hub id). */
  seedId: string;
  /** Village center in world X/Y (server plane). */
  origin: { x: number; y: number };
  /** Houses on each side of the main street (total houses = 2 * halfRows). */
  halfRows?: number;
  /** Distance between road segments along the spine (meters). */
  streetStep?: number;
  /** Lateral offset of house lots from the street centerline. */
  lotDepth?: number;
};

export type LogicalVillageBlueprintResult = {
  objects: WorldObject[];
  /** Paths this blueprint references — verify with `pnpm run audit:model-paths` / admin model-needs. */
  referencedGlbPaths: string[];
  /** Typical gaps for a complete modular village (from `adminGlbModelNeeds` logical suggestions). */
  recommendedModularGlbs: string[];
};

const DEFAULT_HOUSE =
  "/assets/models/structures/woodcillagehouse1.glb";
const DEFAULT_WELL = "/assets/models/marketplace/Marketplace_well.glb";
const DEFAULT_ROAD_STRAIGHT =
  "/assets/models/world-assets/props/road_straight.glb";
const DEFAULT_PLAZA_FLOOR =
  "/assets/models/world-assets/props/plaza_floor.glb";

function stableSlotSuffix(seedId: string, slot: string): string {
  let h = 0;
  const raw = `${seedId}|${slot}`;
  for (let i = 0; i < raw.length; i += 1) {
    h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).slice(0, 8);
}

/**
 * Builds a deterministic **logical** village: one main street, paired house lots,
 * a small plaza with a well, and connector paths. Intended for `WorldObjectSystem`
 * merges, admin previews, or procedural contracts — not a nav-mesh solver.
 */
export function buildLogicalVillageBlueprint(
  opts: LogicalVillageBlueprintOptions,
): LogicalVillageBlueprintResult {
  const seedId = opts.seedId.trim() || "village";
  const ox = opts.origin.x;
  const oy = opts.origin.y;
  const halfRows = Math.max(2, Math.min(8, opts.halfRows ?? 4));
  const streetStep = opts.streetStep ?? 12;
  const lotDepth = opts.lotDepth ?? 14;

  const objects: WorldObject[] = [];
  const referenced = new Set<string>();

  const push = (o: WorldObject) => {
    if (o.glbPath) referenced.add(o.glbPath);
    objects.push(o);
  };

  // Main spine: east-west road through origin
  const spineSegments = halfRows * 2 + 2;
  for (let i = 0; i < spineSegments; i += 1) {
    const x = ox + (i - Math.floor(spineSegments / 2)) * streetStep;
    push({
      id: `lv_${seedId}_road_spine_${i}`,
      type: "road",
      name: `Village Street ${i}`,
      position: { x, y: oy },
      rotation: 0,
      scale: 1,
      glbPath: DEFAULT_ROAD_STRAIGHT,
    });
  }

  // Plaza + well slightly north of spine center
  push({
    id: `lv_${seedId}_plaza`,
    type: "prop",
    name: "Village Plaza",
    position: { x: ox, y: oy + streetStep * 1.2 },
    rotation: 0,
    scale: 1.2,
    glbPath: DEFAULT_PLAZA_FLOOR,
  });
  push({
    id: `lv_${seedId}_well`,
    type: "well",
    name: "Village Well",
    position: { x: ox, y: oy + streetStep * 1.2 + 2 },
    rotation: 0,
    scale: 2.2,
    glbPath: DEFAULT_WELL,
  });

  // Houses: staggered north / south of the street
  for (let row = 0; row < halfRows; row += 1) {
    const along = ox + (row - (halfRows - 1) / 2) * streetStep * 1.5;
    const sufN = stableSlotSuffix(seedId, `hn${row}`);
    const sufS = stableSlotSuffix(seedId, `hs${row}`);
    push({
      id: `lv_${seedId}_house_n_${row}_${sufN}`,
      type: "building",
      name: `Village House N${row + 1}`,
      position: { x: along, y: oy - lotDepth },
      rotation: 0,
      scale: 3.5,
      glbPath: DEFAULT_HOUSE,
    });
    push({
      id: `lv_${seedId}_house_s_${row}_${sufS}`,
      type: "building",
      name: `Village House S${row + 1}`,
      position: { x: along + streetStep * 0.35, y: oy + lotDepth },
      rotation: Math.PI,
      scale: 3.5,
      glbPath: DEFAULT_HOUSE,
    });
  }

  // Short connector paths from street ends toward wilderness
  const endOff = (spineSegments / 2) * streetStep + streetStep * 0.6;
  push({
    id: `lv_${seedId}_path_w`,
    type: "path",
    name: "West Path",
    position: { x: ox - endOff, y: oy },
    rotation: Math.PI / 2,
    scale: 1,
    glbPath: DEFAULT_ROAD_STRAIGHT,
  });
  push({
    id: `lv_${seedId}_path_e`,
    type: "path",
    name: "East Path",
    position: { x: ox + endOff, y: oy },
    rotation: Math.PI / 2,
    scale: 1,
    glbPath: DEFAULT_ROAD_STRAIGHT,
  });

  const recommendedModularGlbs = [
    "/assets/models/world-assets/props/road_left.glb",
    "/assets/models/world-assets/props/road_right.glb",
    "/assets/models/world-assets/props/fence_front.glb",
    "/assets/models/world-assets/props/house_stairs.glb",
  ];

  return {
    objects,
    referencedGlbPaths: [...referenced],
    recommendedModularGlbs,
  };
}
