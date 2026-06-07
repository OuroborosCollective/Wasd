/**
 * NPC VENDOR ROUTES
 *
 * Server-authoritative NPC vendor interaction routes.
 * Provides player-facing messages when interacting with vendors.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now()
 * - Deterministic vendor interactions
 */

import express, { Router } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { getVillageResourceVendor, getVendorById } from "../economy/VillageVendors.js";

const router = Router();

router.use(express.json());

/**
 * GET /api/npc/vendor/:vendorId
 *
 * Get vendor information and dialogue.
 * Returns vendor definition and interaction message.
 */
router.get("/vendor/:vendorId", async (req, res) => {
  const vendorId = req.params.vendorId;

  const vendor = getVendorById(vendorId);
  if (!vendor) {
    res.status(404).json({
      ok: false,
      error: "vendor_not_found",
    });
    return;
  }

  // Return vendor info with dialogue
  res.status(200).json({
    ok: true,
    result: {
      vendor: {
        id: vendor.id,
        name: vendor.name,
        role: vendor.role,
        vendorType: vendor.vendorType,
        position: vendor.position,
        interactionRadius: vendor.interactionRadius,
      },
      dialogue: getVendorDialogue(vendor.id),
    },
  });
});

/**
 * POST /api/npc/vendor/:vendorId/interact
 *
 * Player interacts with vendor.
 * Returns interaction result and dialogue message.
 */
router.post("/vendor/:vendorId/interact", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);
  const vendorId = req.params.vendorId;

  const vendor = getVendorById(vendorId);
  if (!vendor) {
    res.status(404).json({
      ok: false,
      error: "vendor_not_found",
    });
    return;
  }

  res.status(200).json({
    ok: true,
    result: {
      vendorId: vendor.id,
      vendorName: vendor.name,
      message: getVendorDialogue(vendor.id),
      interactionType: "trade",
    },
  });
});

/**
 * Get the dialogue for a vendor.
 * Returns the appropriate message based on vendor ID.
 */
function getVendorDialogue(vendorId: string): string {
  switch (vendorId) {
    case "village_trader_001":
      return "I buy wood, ore, and fish. Bring me what you gather.";
    default:
      return "Welcome, traveler.";
  }
}

export default router;