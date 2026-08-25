/**
 * PROCESSING STATIONS
 *
 * Deterministic processing station definitions for the crafting system.
 * Stations are world POIs that players must be near to craft certain recipes.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now()
 * - Deterministic IDs and positions
 * - Sorted by ID for deterministic iteration
 */

export type ProcessingStationType = "campfire" | "furnace" | "workbench";

export interface ProcessingStation {
  id: string;
  type: ProcessingStationType;
  title: string;
  position: {
    x: number;
    y: number;
  };
  interactionRadius: number;
}

export interface StationDistanceResult {
  withinRange: boolean;
  distance: number;
  requiredDistance: number;
}

/**
 * Calculate Euclidean distance between two positions.
 */
export function calculateDistance(
  posA: { x: number; y: number },
  posB: { x: number; y: number }
): number {
  const dx = posA.x - posB.x;
  const dy = posA.y - posB.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Starter Village Processing Stations
 *
 * Stations are placed near the starter village center (chunk 0/0).
 * Position coordinates derived from village layout.
 */
export const STARTER_PROCESSING_STATIONS: readonly ProcessingStation[] = [
  {
    id: "campfire_001",
    type: "campfire",
    title: "Village Campfire",
    position: {
      x: 465,
      y: 506,
    },
    interactionRadius: 32,
  },
  {
    id: "furnace_001",
    type: "furnace",
    title: "Village Furnace",
    position: {
      x: 470,
      y: 506,
    },
    interactionRadius: 32,
  },
  {
    id: "workbench_001",
    type: "workbench",
    title: "Village Workbench",
    position: {
      x: 468,
      y: 500,
    },
    interactionRadius: 32,
  },
] as const;

// Bolt: Optimization - Pre-sort stations once using direct relational comparison to avoid sorting and localeCompare on every call
const CACHED_STARTER_PROCESSING_STATIONS: readonly ProcessingStation[] = Object.freeze(
  [...STARTER_PROCESSING_STATIONS].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
);

/**
 * Get all starter processing stations.
 */
export function getStarterProcessingStations(): ProcessingStation[] {
  return [...CACHED_STARTER_PROCESSING_STATIONS];
}

/**
 * Get a processing station by ID.
 * Returns undefined if not found.
 */
export function getProcessingStationById(stationId: string): ProcessingStation | undefined {
  return STARTER_PROCESSING_STATIONS.find((s) => s.id === stationId);
}

/**
 * Find the nearest processing station of a specific type.
 * Returns undefined if no station of that type exists.
 */
export function findNearestProcessingStation(
  position: { x: number; y: number },
  type: ProcessingStationType
): ProcessingStation | undefined {
  const stationsOfType = STARTER_PROCESSING_STATIONS.filter((s) => s.type === type);
  if (stationsOfType.length === 0) return undefined;

  let nearest: ProcessingStation | undefined;
  let nearestDistance = Infinity;

  for (const station of stationsOfType) {
    const distance = calculateDistance(position, station.position);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = station;
    }
  }

  return nearest;
}

/**
 * Check if a player position is within a station's interaction radius.
 */
export function isWithinProcessingStationRadius(
  playerPosition: { x: number; y: number },
  station: ProcessingStation
): StationDistanceResult {
  const distance = calculateDistance(playerPosition, station.position);
  return {
    withinRange: distance <= station.interactionRadius,
    distance: Math.round(distance * 100) / 100,
    requiredDistance: station.interactionRadius,
  };
}

/**
 * Check if a player position is within range of any station of a specific type.
 */
export function isWithinAnyStationOfType(
  playerPosition: { x: number; y: number },
  type: ProcessingStationType
): StationDistanceResult & { station?: ProcessingStation } {
  const station = findNearestProcessingStation(playerPosition, type);
  if (!station) {
    return {
      withinRange: false,
      distance: Infinity,
      requiredDistance: 32,
      station: undefined,
    };
  }

  const distanceResult = isWithinProcessingStationRadius(playerPosition, station);
  return {
    ...distanceResult,
    station,
  };
}