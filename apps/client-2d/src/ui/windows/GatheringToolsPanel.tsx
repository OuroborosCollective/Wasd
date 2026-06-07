/**
 * Gathering Tools Equipment Panel
 * 
 * Simple equipment panel for crafted gathering tools.
 * Shows equipped tools and available tools in inventory.
 * Includes "Claim Starter Tools" button when tools are missing.
 * 
 * Deterministic: No Date.now(), no Math.random().
 */

import React, { useCallback, useState } from "react";
import { useSyncExternalStore } from "react";
import type {
  PlayerEquipmentSnapshot,
  PlayerInventorySnapshot,
} from "../../game/liveGameplaySnapshot";
import { equipGatheringTool } from "../../game/equipment";
import { dispatchClaimStarterTools } from "../../game/gameplayActions";

// Tool item IDs
const GATHERING_TOOL_IDS = new Set([
  "wooden_axe",
  "copper_pickaxe",
  "simple_fishing_rod",
]);

// Required tool slot IDs for complete tool setup
const REQUIRED_TOOL_SLOTS = new Set([
  "woodcutting_tool",
  "mining_tool",
  "fishing_tool",
]);

// Slot to skill mapping
const SLOT_LABELS: Record<string, string> = {
  woodcutting_tool: "🪓 Woodcutting",
  mining_tool: "⛏️ Mining",
  fishing_tool: "🎣 Fishing",
};

// ─── Store ────────────────────────────────────────────────────────────────────

interface GatheringToolsPanelState {
  equipment: PlayerEquipmentSnapshot | null;
  inventory: PlayerInventorySnapshot | null;
}

class GatheringToolsPanelStore {
  private state: GatheringToolsPanelState = {
    equipment: null,
    inventory: null,
  };
  private listeners = new Set<() => void>();

  getSnapshot(): GatheringToolsPanelState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setData(equipment: PlayerEquipmentSnapshot | null, inventory: PlayerInventorySnapshot | null): void {
    this.state = { equipment, inventory };
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}

export const gatheringToolsPanelStore = new GatheringToolsPanelStore();

export function useGatheringToolsPanel(): GatheringToolsPanelState {
  return useSyncExternalStore(
    (l) => gatheringToolsPanelStore.subscribe(l),
    () => gatheringToolsPanelStore.getSnapshot(),
    () => ({ equipment: null, inventory: null }),
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  equipment: PlayerEquipmentSnapshot | null;
  inventory: PlayerInventorySnapshot | null;
  onEquip?: (itemId: string) => void;
}

/**
 * Check if player has all required tool slots equipped.
 */
function hasAllToolsEquipped(equipment: PlayerEquipmentSnapshot | null): boolean {
  if (!equipment?.slots?.length) return false;
  const equippedSlots = new Set(equipment.slots.map((s) => s.slotId));
  return [...REQUIRED_TOOL_SLOTS].every((slot) => equippedSlots.has(slot));
}

export function GatheringToolsPanel({ equipment, inventory, onEquip }: Props) {
  const equipped = equipment?.slots ?? [];
  const tools = (inventory?.slots ?? []).filter((slot) =>
    GATHERING_TOOL_IDS.has(slot.itemId)
  );
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);

  const handleEquip = useCallback(
    async (itemId: string) => {
      const result = await equipGatheringTool(itemId);

      // Show toast notification
      window.dispatchEvent(
        new CustomEvent("wasd:toast", {
          detail: {
            type: result.ok ? "success" : "error",
            message: result.ok
              ? "Tool equipped"
              : `Equip failed: ${result.result?.reason ?? "unknown"}`,
          },
        }),
      );

      // Notify parent
      if (result.ok) {
        onEquip?.(itemId);
      }
    },
    [onEquip],
  );

  const handleClaimStarterTools = useCallback(async () => {
    setIsClaiming(true);
    setClaimError(null);
    setClaimSuccess(false);

    const result = await dispatchClaimStarterTools();

    setIsClaiming(false);

    if (result.ok && result.result) {
      if (result.result.changed) {
        setClaimSuccess(true);
        window.dispatchEvent(
          new CustomEvent("wasd:toast", {
            detail: {
              type: "success",
              message: `Starter tools claimed! Equipped: ${result.result.equipped.join(", ") || "none"}`,
            },
          }),
        );
        // Notify parent to refresh
        onEquip?.("starter_tools_claimed");
      } else {
        setClaimSuccess(true);
        window.dispatchEvent(
          new CustomEvent("wasd:toast", {
            detail: {
              type: "info",
              message: "Starter tools already equipped.",
            },
          }),
        );
      }
    } else {
      setClaimError(result.error ?? "Failed to claim tools");
      window.dispatchEvent(
        new CustomEvent("wasd:toast", {
          detail: {
            type: "error",
            message: `Claim failed: ${result.error ?? "unknown"}`,
          },
        }),
      );
    }
  }, [onEquip]);

  // Determine if the "Claim Starter Tools" button should be shown
  const showClaimButton = !hasAllToolsEquipped(equipment);

  return (
    <section
      data-testid="gathering-tools-panel"
      className="are-window gathering-tools-panel"
    >
      <h3 className="panel-title">Equipment</h3>

      <div className="gathering-section">
        <h4 className="section-title">Equipped Tools</h4>
        {equipped.length === 0 ? (
          <p className="empty-text">No tools equipped.</p>
        ) : (
          <ul className="equipped-list">
            {equipped.map((slot) => (
              <li key={slot.slotId} className="equipped-slot">
                <span className="slot-label">{SLOT_LABELS[slot.slotId] ?? slot.slotId}:</span>
                <span className="item-name">{slot.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="gathering-section">
        <h4 className="section-title">Available Tools</h4>
        {tools.length === 0 ? (
          <p className="empty-text">No gathering tools in inventory.</p>
        ) : (
          <div className="tools-grid">
            {tools.map((slot) => (
              <button
                key={slot.slotId}
                type="button"
                className="tool-button"
                onClick={() => handleEquip(slot.itemId)}
                title={`Equip ${slot.name}`}
              >
                <span className="tool-icon">
                  {slot.itemId === "wooden_axe"
                    ? "🪓"
                    : slot.itemId === "copper_pickaxe"
                    ? "⛏️"
                    : "🎣"}
                </span>
                <span className="tool-name">{slot.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {showClaimButton && (
        <div className="gathering-section claim-section">
          <h4 className="section-title">Need Tools?</h4>
          <p className="claim-description">
            Gather resources outside the starter village requires proper tools.
          </p>
          <button
            type="button"
            className="claim-starter-tools-button"
            data-testid="claim-starter-tools-button"
            onClick={handleClaimStarterTools}
            disabled={isClaiming}
          >
            {isClaiming ? "Claiming..." : "Claim Starter Tools"}
          </button>
          {claimError && (
            <p className="claim-error">{claimError}</p>
          )}
        </div>
      )}
    </section>
  );
}