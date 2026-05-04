// @ts-nocheck
/**
 * GLBFootprintResolver - Maps GLB asset paths and types to footprint descriptors.
 *
 * Uses a registry of known assets, naming conventions, and defaults.
 * Can be extended with per-asset metadata files.
 */

import type { GLBFootprintDescriptor, LayoutCategory } from "./WorldLayoutTypes.js";

// ─── Default Footprints by Category ────────────────────────────────────────

const DEFAULT_FOOTPRINTS: Record<string, Partial<GLBFootprintDescriptor>> = {
  house: { width: 8, depth: 8, height: 6, minSpacing: 2, requiresRoadAccess: true, doorwaySide: "south" },
  wall: { width: 10, depth: 2, height: 5, minSpacing: 0, requiresWallSnap: true, snapSockets: ["wall_left", "wall_right"] },
  gate: { width: 6, depth: 4, height: 6, minSpacing: 0, requiresWallSnap: true, snapSockets: ["wall_left", "wall_right"], doorwaySide: "north" },
  tower: { width: 5, depth: 5, height: 10, minSpacing: 1 },
  road: { width: 4, depth: 4, height: 0.2, minSpacing: 0 },
  path: { width: 2, depth: 2, height: 0.1, minSpacing: 0 },
  dungeon: { width: 16, depth: 16, height: 8, minSpacing: 10 },
  door: { width: 2, depth: 1, height: 3, minSpacing: 0 },
  decoration: { width: 2, depth: 2, height: 3, minSpacing: 1 },
  tree: { width: 3, depth: 3, height: 6, minSpacing: 2 },
  well: { width: 3, depth: 3, height: 2, minSpacing: 2 },
  market: { width: 6, depth: 4, height: 4, minSpacing: 1, requiresRoadAccess: true },
  castle: { width: 20, depth: 20, height: 12, minSpacing: 5 },
  bridge: { width: 6, depth: 3, height: 2, minSpacing: 0 },
  fence: { width: 6, depth: 1, height: 2, minSpacing: 0 },
  unknown: { width: 4, depth: 4, height: 4, minSpacing: 2 },
};

// ─── Naming Convention Patterns ────────────────────────────────────────────

const NAME_PATTERNS: Array<{ pattern: RegExp; category: LayoutCategory }> = [
  { pattern: /house|hut|cottage|home|dwelling/i, category: "house" },
  { pattern: /wall|fence|barrier|palisade/i, category: "wall" },
  { pattern: /gate|portal|entrance|door/i, category: "gate" },
  { pattern: /tower|turret|watchtower/i, category: "tower" },
  { pattern: /road|street|path|pavement|cobble/i, category: "road" },
  { pattern: /dungeon|cave|lair|boss/i, category: "dungeon" },
  { pattern: /tree|oak|pine|birch/i, category: "tree" },
  { pattern: /well|fountain|spring/i, category: "well" },
  { pattern: /market|stall|shop|merchant/i, category: "market" },
  { pattern: /castle|keep|fortress|fort/i, category: "castle" },
  { pattern: /bridge/i, category: "bridge" },
  { pattern: /fence/i, category: "fence" },
  { pattern: /deco|statue|lamp|torch|bench|barrel/i, category: "decoration" },
];

// ─── Type-to-Category Map ──────────────────────────────────────────────────

const TYPE_TO_CATEGORY: Record<string, LayoutCategory> = {
  building: "house",
  prop: "decoration",
  wall: "wall",
  gate: "gate",
  tower: "tower",
  road: "road",
  path: "path",
  dungeon: "dungeon",
  door: "door",
  tree: "tree",
  well: "well",
  market: "market",
  castle: "castle",
  bridge: "bridge",
  fence: "fence",
};

/**
 * Resolve the layout category from an entity type and name.
 */
export function resolveCategory(type: string, name: string, glbPath?: string): LayoutCategory {
  // 1. Direct type mapping
  if (type in TYPE_TO_CATEGORY) {
    return TYPE_TO_CATEGORY[type];
  }

  // 2. Name pattern matching
  for (const { pattern, category } of NAME_PATTERNS) {
    if (pattern.test(name)) {
      return category;
    }
  }

  // 3. GLB path pattern matching
  if (glbPath) {
    for (const { pattern, category } of NAME_PATTERNS) {
      if (pattern.test(glbPath)) {
        return category;
      }
    }
  }

  return "unknown";
}

/**
 * Resolve a footprint descriptor for an entity.
 * First checks the registry, then falls back to category defaults.
 */
export function resolveFootprint(
  assetPath: string | undefined,
  category: LayoutCategory,
  registry?: Map<string, GLBFootprintDescriptor>
): GLBFootprintDescriptor {
  // 1. Check registry by asset path
  if (assetPath && registry?.has(assetPath)) {
    return registry.get(assetPath)!;
  }

  // 2. Fall back to category defaults
  const defaults = DEFAULT_FOOTPRINTS[category] ?? DEFAULT_FOOTPRINTS.unknown;

  return {
    assetPath: assetPath ?? "",
    category,
    width: defaults.width ?? 4,
    depth: defaults.depth ?? 4,
    height: defaults.height ?? 4,
    minSpacing: defaults.minSpacing ?? 2,
    requiresRoadAccess: defaults.requiresRoadAccess ?? false,
    requiresWallSnap: defaults.requiresWallSnap ?? false,
    allowedRotations: defaults.allowedRotations ?? [],
    doorwaySide: defaults.doorwaySide,
    snapSockets: defaults.snapSockets ?? [],
    groundOffset: defaults.groundOffset ?? 0,
  };
}

/**
 * Get all known categories.
 */
export function getKnownCategories(): LayoutCategory[] {
  return Object.keys(DEFAULT_FOOTPRINTS) as LayoutCategory[];
}

/**
 * Register a custom footprint for a specific asset.
 */
export function createFootprintRegistry(
  entries: Array<{ assetPath: string; descriptor: GLBFootprintDescriptor }>
): Map<string, GLBFootprintDescriptor> {
  const registry = new Map<string, GLBFootprintDescriptor>();
  for (const entry of entries) {
    registry.set(entry.assetPath, entry.descriptor);
  }
  return registry;
}
