/**
 * ONBOARDING API ROUTE
 *
 * Server-authoritative onboarding flow for new players.
 * Provides deterministic starter tool bundle acquisition.
 *
 * Phase 11: Integrated with OuroborosTickSystem via TickSystemContextProvider.
 * Uses deterministic tick context for idempotency.
 *
 * Rules:
 * - No Date.now() for gameplay state
 * - No Math.random()
 * - Server-authoritative playerId resolution
 * - Idempotent: claiming twice does not duplicate tools
 * - Tools are added to inventory AND auto-equipped
 */

import { Router } from "express";
import { json } from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";
import { equipmentService } from "../equipment/equipmentRuntime.js";
import { EQUIPMENT_DEFINITIONS } from "../equipment/EquipmentTypes.js";
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";

const router = Router();

// Parse JSON bodies for POST requests
router.use(json());

/**
 * Starter tool bundle - one of each gathering tool type
 */
const STARTER_TOOL_BUNDLE = [
  { itemId: "copper_pickaxe", slotId: "mining_tool" as const },
  { itemId: "simple_fishing_rod", slotId: "fishing_tool" as const },
  { itemId: "wooden_axe", slotId: "woodcutting_tool" as const },
] as const;

/**
 * Check if a player already has tools equipped in the required slots.
 */
async function hasToolsEquipped(playerId: string): Promise<boolean> {
  const equipment = await equipmentService.getPlayerEquipment(playerId);
  const equippedSlots = new Set(equipment.slots.map((s) => s.slotId));
  return STARTER_TOOL_BUNDLE.every((tool) => equippedSlots.has(tool.slotId));
}

/**
 * Check if a player already has tools in their inventory.
 */
async function hasToolsInInventory(playerId: string): Promise<boolean> {
  const inventory = await getInventoryService().then((s) => s.getPlayerInventory(playerId));
  const ownedToolIds = new Set(inventory.slots.map((s) => s.itemId));
  return STARTER_TOOL_BUNDLE.every((tool) => ownedToolIds.has(tool.itemId));
}

/**
 * POST /api/onboarding/claim-starter-tools
 *
 * Claim the starter tool bundle.
 * Idempotent: if tools are already owned/equipped, returns ok=true, changed=false.
 *
 * Response:
 * {
 *   ok: true,
 *   result: {
 *     changed: boolean,       // true if tools were newly added
 *     tools: string[],         // list of tool itemIds
 *     equipped: string[]       // list of equipped slotIds
 *   }
 * }
 */
router.post("/claim-starter-tools", async (req, res) => {
  const identity = resolveHttpPlayerIdentity(req);

  if (process.env.NODE_ENV === "production" && !identity.authenticated) {
    res.status(401).json({ ok: false, error: "authenticated_player_required" });
    return;
  }

  const playerId = identity.playerId;

  try {
    // Check idempotency: if already has tools equipped, return success without changes
    const alreadyEquipped = await hasToolsEquipped(playerId);
    if (alreadyEquipped) {
      res.json({
        ok: true,
        result: {
          changed: false,
          tools: STARTER_TOOL_BUNDLE.map((t) => t.itemId),
          equipped: STARTER_TOOL_BUNDLE.map((t) => t.slotId),
          reason: "already_equipped",
        },
      });
      return;
    }

    const inventoryService = await getInventoryService();
    const equippedSlots: string[] = [];
    const failedTools: string[] = [];

    // Add each tool to inventory if not already present
    for (const tool of STARTER_TOOL_BUNDLE) {
      const hasTool = await inventoryService.hasItems({
        playerId,
        items: [{ itemId: tool.itemId, quantity: 1 }],
      });

      if (!hasTool) {
        // Add tool to inventory
        const addResult = await inventoryService.addItem({
          playerId,
          itemId: tool.itemId,
          quantity: 1,
        });

        if (!addResult.ok) {
          console.warn(
            `[onboarding] Failed to add ${tool.itemId} to inventory for ${playerId}: ${addResult.reason}`,
          );
          failedTools.push(tool.itemId);
          continue;
        }
      }

      // Auto-equip the tool
      const equipResult = await equipmentService.equipItem({
        playerId,
        itemId: tool.itemId,
      });

      if (equipResult.ok) {
        equippedSlots.push(tool.slotId);
      } else {
        console.warn(
          `[onboarding] Failed to equip ${tool.itemId} for ${playerId}: ${equipResult.reason}`,
        );
      }
    }

    // Return success even if some tools failed (partial success)
    // Phase 11: Include deterministic tick context for Ouroboros integration
    const tickContext = tickContextProvider.getContext();
    res.json({
      ok: true,
      result: {
        changed: true,
        tools: STARTER_TOOL_BUNDLE.map((t) => t.itemId),
        equipped: equippedSlots,
        failed: failedTools.length > 0 ? failedTools : undefined,
      },
      // Ouroboros tick system context for deterministic tracking
      tickContext: {
        tickId: tickContext.tickId,
        worldTimeHours: tickContext.worldTimeHours,
        seedHash: tickContext.seedHash,
      },
    });
  } catch (error) {
    console.error("[onboarding] Failed to claim starter tools:", error);
    res.status(500).json({
      ok: false,
      error: "internal_error",
    });
  }
});

export default router;