/**
 * WORLD POI TYPES
 *
 * Deterministic world Point of Interest types for ARELogic.
 * POIs are static world locations that provide gameplay context.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now()
 * - Deterministic IDs and positions
 * - Sorted by ID for deterministic iteration
 */

/**
 * World POI Types
 * These types represent different categories of world POIs.
 */
export type WorldPoiType =
  | "logging_camp"
  | "mining_camp"
  | "fishing_camp"
  | "campfire"
  | "furnace"
  | "workbench"
  | "village_trader";

/**
 * World POI Snapshot
 * Represents a single POI in the game world.
 */
export interface WorldPoiSnapshot {
  readonly id: string;
  readonly type: WorldPoiType;
  readonly title: string;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly chunk: {
    readonly x: number;
    readonly z: number;
  };
  readonly interactionRadius: number;
  readonly tags: readonly string[];
}

/**
 * Resource bias types for gathering camps.
 * When a camp is present, resources of this type are more common.
 */
export type CampResourceBias = "tree" | "ore" | "fish_spot";

/**
 * Get the resource bias for a camp type.
 */
export function getCampResourceBias(type: WorldPoiType): CampResourceBias | null {
  switch (type) {
    case "logging_camp":
      return "tree";
    case "mining_camp":
      return "ore";
    case "fishing_camp":
      return "fish_spot";
    default:
      return null;
  }
}

/**
 * Get display emoji for a POI type.
 */
export function getPoiEmoji(type: WorldPoiType): string {
  switch (type) {
    case "logging_camp":
      return "🪓";
    case "mining_camp":
      return "⛏️";
    case "fishing_camp":
      return "🎣";
    case "campfire":
      return "🔥";
    case "furnace":
      return "🧱";
    case "workbench":
      return "🛠️";
    case "village_trader":
      return "🏪";
    default:
      return "📍";
  }
}

/**
 * Get display name for a POI type.
 */
export function getPoiTypeName(type: WorldPoiType): string {
  switch (type) {
    case "logging_camp":
      return "Logging Camp";
    case "mining_camp":
      return "Mining Camp";
    case "fishing_camp":
      return "Fishing Camp";
    case "campfire":
      return "Campfire";
    case "furnace":
      return "Furnace";
    case "workbench":
      return "Workbench";
    case "village_trader":
      return "Village Trader";
    default:
      return "Unknown";
  }
}