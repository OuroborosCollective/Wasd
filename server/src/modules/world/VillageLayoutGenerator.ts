import type { WorldObject } from "./WorldObjectSystem.js";

/** KayKit medieval hex road tile — flat segment reads as cobbled street under houses. */
const STREET_SEGMENT =
  "/assets/models/kaykit/medieval_hex/tiles/roads/hex_road_A.gltf";

const HOUSE_LARGE = "/assets/models/structures/woodcillagehouse1.glb";
const HOUSE_SMALL = "/assets/models/buildings/house_small.glb";
const HOUSE_MEDIUM = "/assets/models/buildings/house_medium.glb";
const VILLAGE_WELL = "/assets/models/marketplace/Marketplace_well.glb";

export type StarterVillageOptions = {
  /** World XZ center (server uses x,y as ground plane). */
  origin?: { x: number; y: number };
};

/**
 * Deterministic starter hamlet: one main street (typed `road`), paired houses,
 * a central well, and a small back lane — enough for layout validators and
 * client rendering without hand-placing dozens of props.
 */
export function buildLogicalStarterVillage(
  opts: StarterVillageOptions = {},
): WorldObject[] {
  const ox = opts.origin?.x ?? 118;
  const oy = opts.origin?.y ?? -42;
  const objects: WorldObject[] = [];

  const houses = [HOUSE_LARGE, HOUSE_SMALL, HOUSE_MEDIUM, HOUSE_SMALL];

  // Main street along +X (types/names match WorldLayoutFootprintResolver road patterns)
  for (let i = -5; i <= 5; i += 1) {
    objects.push({
      id: `logical_village_street_${i}`,
      type: "road",
      name: "Village Street",
      position: { x: ox + i * 5.4, y: oy },
      rotation: 0,
      scale: 1.35,
      glbPath: STREET_SEGMENT,
    });
  }

  // Houses north of the street
  for (let h = 0; h < 4; h += 1) {
    objects.push({
      id: `logical_village_house_n_${h}`,
      type: "building",
      name: `Cottage ${h + 1}`,
      position: { x: ox - 12 + h * 8, y: oy - 14 },
      rotation: h % 2 === 0 ? 0.12 : -0.1,
      scale: h === 0 ? 3.8 : 3.2,
      glbPath: houses[h % houses.length]!,
    });
  }

  // Houses south
  for (let h = 0; h < 4; h += 1) {
    objects.push({
      id: `logical_village_house_s_${h}`,
      type: "building",
      name: `Homestead ${h + 1}`,
      position: { x: ox - 10 + h * 8.2, y: oy + 14 },
      rotation: h % 2 === 0 ? -0.08 : 0.15,
      scale: 3.1,
      glbPath: houses[(h + 1) % houses.length]!,
    });
  }

  // Short cross lane (side street)
  for (let j = -1; j <= 1; j += 1) {
    objects.push({
      id: `logical_village_lane_${j}`,
      type: "road",
      name: "Market Lane",
      position: { x: ox + 2, y: oy + j * 5.4 },
      rotation: Math.PI / 2,
      scale: 1.2,
      glbPath: STREET_SEGMENT,
    });
  }

  objects.push({
    id: "logical_village_well",
    type: "prop",
    name: "Communal Well",
    position: { x: ox + 1, y: oy - 5 },
    rotation: 0.4,
    scale: 2.4,
    glbPath: VILLAGE_WELL,
  });

  return objects;
}

export function hasStarterVillageLayout(objects: Iterable<WorldObject>): boolean {
  for (const o of objects) {
    if (o.id.startsWith("logical_village_street_")) return true;
  }
  return false;
}
