/**
 * VILLAGE VENDORS
 *
 * Deterministic vendor NPC definitions for the economy system.
 * Vendors are stationary NPCs that players must be near to sell resources.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now()
 * - Deterministic IDs and positions
 */

export interface VendorDefinition {
  id: string;
  name: string;
  role: "vendor";
  vendorType: "resource_trader";
  position: {
    x: number;
    y: number;
  };
  interactionRadius: number;
}

export interface VendorDistanceResult {
  withinRange: boolean;
  distance: number;
  requiredDistance: number;
}

/**
 * Village Trader - the primary resource vendor NPC.
 * Position is near the starter village center (chunk 0/0).
 *
 * Position derived from world coordinate system:
 * - Starter village center: approximately (460, 500)
 * - Vendor placed slightly east of center for visibility
 */
export const VILLAGE_TRADER: VendorDefinition = {
  id: "village_trader_001",
  name: "Mira the Quartermaster",
  role: "vendor",
  vendorType: "resource_trader",
  position: {
    x: 462,
    y: 503,
  },
  interactionRadius: 32,
} as const;

/**
 * Get the village resource vendor.
 * Returns the single village trader for all resource selling.
 */
export function getVillageResourceVendor(): VendorDefinition {
  return VILLAGE_TRADER;
}

/**
 * Calculate Euclidean distance between two positions.
 * Uses standard Euclidean distance formula.
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
 * Check if a player position is within vendor interaction range.
 */
export function checkVendorProximity(
  playerPosition: { x: number; y: number },
  vendor: VendorDefinition = VILLAGE_TRADER
): VendorDistanceResult {
  const distance = calculateDistance(playerPosition, vendor.position);
  return {
    withinRange: distance <= vendor.interactionRadius,
    distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
    requiredDistance: vendor.interactionRadius,
  };
}

/**
 * Get all vendors (for future expansion).
 * Currently returns only the village trader.
 */
export function getAllVendors(): VendorDefinition[] {
  return [VILLAGE_TRADER];
}

/**
 * Find a vendor by ID.
 * Returns undefined if not found.
 */
export function getVendorById(vendorId: string): VendorDefinition | undefined {
  if (vendorId === VILLAGE_TRADER.id) {
    return VILLAGE_TRADER;
  }
  return undefined;
}