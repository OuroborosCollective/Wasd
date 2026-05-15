import type { WorldObject } from "./WorldObjectSystem.js";

/**
 * Deterministic starter village: main street, cross street, houses, well, wall segments.
 * GLB paths mirror `game-data/glb-links.json` (mirrored under `client/public/assets/models/world-assets`).
 *
 * Rotations are **degrees** (y-axis), matching `EntityViewModel` / BabylonAdapter expectations.
 */
const ASSETS = {
  house: "/assets/models/world-assets/buildings/woodcillagehouse1.glb",
  roadStraight: "/assets/models/world-assets/props/road_straight.glb",
  roadCorner: "/assets/models/world-assets/props/road_corner.glb",
  well: "/assets/models/world-assets/props/well.glb",
  wallStraight: "/assets/models/world-assets/props/wall_straight.glb",
  market: "/assets/models/kaykit/medieval_hex/buildings/blue/building_market_blue.gltf",
} as const;

export function buildStarterVillageObjects(origin: { x: number; y: number }): WorldObject[] {
  const { x: ox, y: oy } = origin;
  const out: WorldObject[] = [];

  for (let i = -4; i <= 4; i++) {
    out.push({
      id: `vlg_seed_road_main_${i}`,
      type: "road",
      name: "Village main street",
      position: { x: ox + i * 8, y: oy },
      rotation: 0,
      scale: 1.15,
      glbPath: ASSETS.roadStraight,
    });
  }

  for (let j = -3; j <= 3; j++) {
    if (j === 0) continue;
    out.push({
      id: `vlg_seed_road_cross_${j}`,
      type: "road",
      name: "Village cross street",
      position: { x: ox, y: oy + j * 8 },
      rotation: 90,
      scale: 1.12,
      glbPath: ASSETS.roadStraight,
    });
  }

  for (const [sx, sy, deg] of [
    [-1, -1, 0],
    [1, -1, 90],
    [1, 1, 180],
    [-1, 1, 270],
  ] as const) {
    out.push({
      id: `vlg_seed_road_corner_${sx}_${sy}`,
      type: "road",
      name: "Village road corner",
      position: { x: ox + sx * 8, y: oy + sy * 8 },
      rotation: deg,
      scale: 1.05,
      glbPath: ASSETS.roadCorner,
    });
  }

  const houseSlots: Array<{ x: number; y: number; rot: number; label: string }> = [
    { x: -3, y: -2, rot: 12, label: "Cottage" },
    { x: 3, y: -2, rot: -8, label: "Cottage" },
    { x: -3, y: 2, rot: 18, label: "Cottage" },
    { x: 3, y: 2, rot: -12, label: "Cottage" },
    { x: -2, y: -3, rot: 92, label: "Hovel" },
    { x: 2, y: -3, rot: 88, label: "Hovel" },
    { x: -2, y: 3, rot: -88, label: "Hovel" },
    { x: 2, y: 3, rot: -92, label: "Hovel" },
  ];
  for (let i = 0; i < houseSlots.length; i++) {
    const h = houseSlots[i]!;
    out.push({
      id: `vlg_seed_house_${i}`,
      type: "building",
      name: h.label,
      position: { x: ox + h.x * 8, y: oy + h.y * 8 },
      rotation: h.rot,
      scale: 1.35,
      glbPath: ASSETS.house,
    });
  }

  out.push({
    id: "vlg_seed_market_hall",
    type: "building",
    name: "Village market hall",
    position: { x: ox, y: oy - 28 },
    rotation: 0,
    scale: 1.1,
    glbPath: ASSETS.market,
  });

  out.push({
    id: "vlg_seed_well_plaza",
    type: "prop",
    name: "Village well",
    position: { x: ox, y: oy },
    rotation: 0,
    scale: 1.4,
    glbPath: ASSETS.well,
  });

  for (let i = -5; i <= 5; i += 5) {
    out.push({
      id: `vlg_seed_wall_${i}`,
      type: "wall",
      name: "Palisade",
      position: { x: ox + i * 8, y: oy + 36 },
      rotation: 0,
      scale: 1.2,
      glbPath: ASSETS.wallStraight,
    });
  }

  return out;
}
