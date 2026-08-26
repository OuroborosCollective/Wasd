/**
 * VILLAGE VENDORS
 *
 * Deterministic vendor NPC definitions for the economy system.
 * Vendors are stationary NPCs that players must be near to sell resources.
 *
 * Rules:
 * - No host randomness
 * - No wall-clock gameplay truth
 * - Deterministic IDs and positions
 */

import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import { chunkKeyFromWorldPosition } from "../intents/ServerCanonicalIntent.js";

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

export interface VendorActorEvidence {
  readonly schemaVersion: 1;
  readonly actorId: string;
  readonly actorType: "npc";
  readonly role: VendorDefinition["role"];
  readonly vendorType: VendorDefinition["vendorType"];
  readonly position: VendorDefinition["position"];
  readonly chunkKey: string;
  readonly definitionHash: string;
}

export interface VendorDistanceResult {
  withinRange: boolean;
  distance: number;
  requiredDistance: number;
}

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

export function getVillageResourceVendor(): VendorDefinition {
  return VILLAGE_TRADER;
}

export function calculateDistance(
  posA: { x: number; y: number },
  posB: { x: number; y: number }
): number {
  const dx = posA.x - posB.x;
  const dy = posA.y - posB.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function checkVendorProximity(
  playerPosition: { x: number; y: number },
  vendor: VendorDefinition = VILLAGE_TRADER
): VendorDistanceResult {
  const distance = calculateDistance(playerPosition, vendor.position);
  return {
    withinRange: distance <= vendor.interactionRadius,
    distance: Math.round(distance * 100) / 100,
    requiredDistance: vendor.interactionRadius,
  };
}

export function getAllVendors(): VendorDefinition[] {
  return [VILLAGE_TRADER];
}

export function getVendorById(vendorId: string): VendorDefinition | undefined {
  if (vendorId === VILLAGE_TRADER.id) {
    return VILLAGE_TRADER;
  }
  return undefined;
}

export function getVendorActorEvidence(vendorId: string): VendorActorEvidence | null {
  const vendor = getVendorById(vendorId);
  if (!vendor) return null;

  const chunkKey = chunkKeyFromWorldPosition(vendor.position);
  const definitionHash = stableHash32([
    "VENDOR_ACTOR_V1",
    vendor.id,
    vendor.name,
    vendor.role,
    vendor.vendorType,
    vendor.position.x,
    vendor.position.y,
    vendor.interactionRadius,
    chunkKey,
  ].join("|")).toString(16);

  return Object.freeze({
    schemaVersion: 1,
    actorId: vendor.id,
    actorType: "npc",
    role: vendor.role,
    vendorType: vendor.vendorType,
    position: Object.freeze({ ...vendor.position }),
    chunkKey,
    definitionHash,
  });
}
