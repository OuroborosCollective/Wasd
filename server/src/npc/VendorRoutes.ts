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
import { getDemandHint } from "../economy/DemandPricing.js";
import { getVendorStockService } from "../economy/economyRuntime.js";

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

  // Get stock info for dialogue hints
  let dialogue = getVendorDialogue(vendor.id);
  try {
    const vendorStockService = await getVendorStockService();
    const stockEntries = await vendorStockService.getStockEntries(vendor.id);
    const demandHint = getDemandHint(stockEntries);
    dialogue = demandHint.message;
  } catch {
    // Use default dialogue if stock service unavailable
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
      dialogue,
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

  // Get stock-based dialogue
  let message = getVendorDialogue(vendor.id);
  try {
    const vendorStockService = await getVendorStockService();
    const stockEntries = await vendorStockService.getStockEntries(vendor.id);
    const demandHint = getDemandHint(stockEntries);
    message = demandHint.message;
  } catch {
    // Use default dialogue if stock service unavailable
  }

  res.status(200).json({
    ok: true,
    result: {
      vendorId: vendor.id,
      vendorName: vendor.name,
      message,
      interactionType: "trade",
    },
  });
});

/**
 * GET /api/npc/vendor/:vendorId/stock
 *
 * Get vendor stock summary for admin/debug purposes.
 */
router.get("/vendor/:vendorId/stock", async (req, res) => {
  const vendorId = req.params.vendorId;

  const vendor = getVendorById(vendorId);
  if (!vendor) {
    res.status(404).json({
      ok: false,
      error: "vendor_not_found",
    });
    return;
  }

  try {
    const vendorStockService = await getVendorStockService();
    const stockEntries = await vendorStockService.getStockEntries(vendor.id);

    res.status(200).json({
      ok: true,
      result: {
        vendorId: vendor.id,
        vendorName: vendor.name,
        stock: stockEntries,
        demandHint: getDemandHint(stockEntries),
      },
    });
  } catch (error) {
    console.error("[vendor-stock] Failed to get stock:", error);
    res.status(500).json({
      ok: false,
      error: "internal_error",
    });
  }
});

/**
 * Get the dialogue for a vendor.
 * Returns the appropriate message based on vendor ID.
 */
function getVendorDialogue(vendorId: string): string {
  switch (vendorId) {
    case "village_trader_001":
      return "I buy wood, ore, and fish. Bring me what you gather. Processed goods pay best.";
    default:
      return "Welcome, traveler.";
  }
}

export default router;