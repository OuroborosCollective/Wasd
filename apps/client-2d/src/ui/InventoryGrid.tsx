/**
 * Ouroboros InventoryGrid — WoW-Style Visual Inventory Component
 * 
 * Replaces the text-based inventory list with a classic MMORPG slot grid.
 * Renders item icons with rarity borders and hover tooltips.
 * 
 * Core Principles:
 * - Stateless determinism: Renders from server inventory_snapshot
 * - Pure React + native CSS: No Tailwind
 * - Brutalist MMORPG aesthetic: Dark metallic palette, hard edges
 */

import { useState, useCallback, useMemo, useEffect, useSyncExternalStore } from "react";
import {
  type ModularItem,
  type EquipSlot,
  EQUIP_SLOTS,
  type PlayerInventorySnapshot,
  type InventoryIntent,
} from "@wasd/shared";
import {
  resolveItemIcon,
  hasGlowEffect,
  hasRuneEnchantment,
  hasPrefix,
  hasSuffix,
  getMaterialName,
  getRuneElementName,
  type IconResolution,
} from "./utils/ItemIconMapper";
import "./inventoryGrid.css";

// ─── Constants ─────────────────────────────────────────────────────────────

const GRID_COLUMNS = 4;
const DEFAULT_SLOT_COUNT = 24;

const EQUIP_SLOT_LABELS: Record<EquipSlot, string> = {
  HEAD: "Head",
  CHEST: "Chest",
  MAIN_HAND: "Main Hand",
  OFF_HAND: "Off Hand",
  RING_1: "Ring 1",
  RING_2: "Ring 2",
  BOOTS: "Boots",
  GLOVES: "Gloves",
};

// ─── State Store ─────────────────────────────────────────────────────────────

class InventoryGridStore {
  private state: PlayerInventorySnapshot | null = null;
  private pendingIntent: InventoryIntent | null = null;
  private blockedIndices = new Set<number>();
  private blockedEquipSlots = new Set<EquipSlot>();
  private readonly listeners = new Set<() => void>();

  getSnapshot() { return this.state; }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(l => l());
  }

  receiveSnapshot(snapshot: PlayerInventorySnapshot): void {
    this.state = snapshot;
    this.pendingIntent = null;
    this.blockedIndices.clear();
    this.blockedEquipSlots.clear();
    this.notify();
  }

  receiveEvent(event: { event: string; slot?: EquipSlot; item?: ModularItem | null }): void {
    if (!this.state) return;
    
    if (event.event === "item_equipped" && event.slot) {
      this.state = {
        ...this.state,
        equipment: { ...this.state.equipment, [event.slot]: event.item ?? null },
      };
    } else if (event.event === "item_unequipped" && event.slot) {
      this.state = {
        ...this.state,
        equipment: { ...this.state.equipment, [event.slot]: null },
      };
    }
    this.notify();
  }

  dispatchIntent(intent: InventoryIntent): void {
    this.pendingIntent = intent;

    if (intent.intent === "equip") {
      this.blockedIndices.add(intent.inventorySlotIndex);
      this.blockedEquipSlots.add(intent.targetEquipSlot);
    } else if (intent.intent === "unequip") {
      this.blockedEquipSlots.add(intent.equipSlot);
      this.blockedIndices.add(intent.targetInventorySlotIndex);
    } else if (intent.intent === "move") {
      this.blockedIndices.add(intent.fromSlot);
      this.blockedIndices.add(intent.toSlot);
    } else if (intent.intent === "drop") {
      this.blockedIndices.add(intent.inventorySlotIndex);
    }

    this.notify();
  }

  isBlocked(indexOrSlot: number | EquipSlot): boolean {
    return typeof indexOrSlot === "string"
      ? this.blockedEquipSlots.has(indexOrSlot)
      : this.blockedIndices.has(indexOrSlot);
  }

  hasPending(): boolean { return this.pendingIntent !== null; }

  clearPending(): void {
    this.pendingIntent = null;
    this.blockedIndices.clear();
    this.blockedEquipSlots.clear();
    this.notify();
  }
}

export const inventoryGridStore = new InventoryGridStore();

export function useInventoryGrid(): PlayerInventorySnapshot | null {
  return useSyncExternalStore(
    (listener) => inventoryGridStore.subscribe(listener),
    () => inventoryGridStore.getSnapshot(),
    () => null
  );
}

// Re-export singleton accessor for external components
export { inventoryGridStore as inventoryStore };

// ─── Tooltip Component ───────────────────────────────────────────────────────

interface ItemTooltipProps {
  item: ModularItem;
  icon: IconResolution;
}

function ItemTooltip({ item, icon }: ItemTooltipProps) {
  const stats = useMemo(() => {
    const lines: string[] = [];
    const { stats } = item;
    if (stats.damage !== undefined) lines.push(`Damage: ${stats.damage}`);
    if (stats.armor !== undefined) lines.push(`Armor: ${stats.armor}`);
    if (stats.attackSpeed !== undefined) lines.push(`Speed: ${stats.attackSpeed.toFixed(2)}`);
    if (stats.critChance !== undefined) lines.push(`Crit: +${stats.critChance}%`);
    if (stats.critMultiplier !== undefined) lines.push(`Crit Mult: ${stats.critMultiplier}x`);
    if (stats.health !== undefined) lines.push(`Health: +${stats.health}`);
    if (stats.mana !== undefined) lines.push(`Mana: +${stats.mana}`);
    if (stats.strength !== undefined) lines.push(`Strength: +${stats.strength}`);
    if (stats.agility !== undefined) lines.push(`Agility: +${stats.agility}`);
    if (stats.intelligence !== undefined) lines.push(`Intelligence: +${stats.intelligence}`);
    if (stats.fireRes !== undefined) lines.push(`Fire Resist: +${stats.fireRes}%`);
    if (stats.iceRes !== undefined) lines.push(`Ice Resist: +${stats.iceRes}%`);
    if (stats.lightningRes !== undefined) lines.push(`Lightning Resist: +${stats.lightningRes}%`);
    return lines;
  }, [item]);

  return (
    <div className="wow-tooltip" style={{ borderColor: icon.borderColor }}>
      <div className="tooltip-name" style={{ color: icon.borderColor }}>
        {item.name}
      </div>
      <div className="tooltip-ilvl">iLvl {item.ilvl}</div>
      <div className="tooltip-rarity">{item.rarity}</div>
      {item.slot && <div className="tooltip-slot">Slot: {item.slot}</div>}
      {item.requiredLevel && item.requiredLevel > 1 && (
        <div className="tooltip-req">Requires Level {item.requiredLevel}</div>
      )}
      {item.requiredClass && (
        <div className="tooltip-class">Class: {item.requiredClass}</div>
      )}
      <div className="tooltip-divider" />
      {stats.map((line, i) => (
        <div key={i} className="tooltip-stat">{line}</div>
      ))}
      {hasRuneEnchantment(item) && (
        <div className="tooltip-enchant">Enchanted</div>
      )}
      {hasPrefix(item) && (
        <div className="tooltip-affix tooltip-prefix">Magical</div>
      )}
    </div>
  );
}

// ─── Inventory Slot Component ───────────────────────────────────────────────

interface InventorySlotProps {
  index: number;
  item: ModularItem | null;
  isBlocked: boolean;
  onEquip?: (index: number) => void;
  onMove?: (from: number, to: number) => void;
  onDrop?: (index: number) => void;
}

function InventorySlot({ index, item, isBlocked, onEquip, onMove, onDrop }: InventorySlotProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const icon = useMemo(() => item ? resolveItemIcon(item) : null, [item]);
  const glow = item && hasGlowEffect(item.rarity);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (!item) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipPos({ x: rect.right + 8, y: rect.top });
    setShowTooltip(true);
  }, [item]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const handleClick = useCallback(() => {
    if (isBlocked || !item) return;
    onEquip?.(index);
  }, [isBlocked, item, index, onEquip]);

  const classNames = [
    "wow-slot",
    item ? "has-item" : "empty",
    isBlocked ? "blocked" : "",
    glow ? "has-glow" : "",
    icon ? icon.rarityClass : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={classNames}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="button"
      aria-label={item ? `Slot ${index + 1}: ${item.name}` : `Slot ${index + 1}: Empty`}
      tabIndex={0}
    >
      {isBlocked && <div className="slot-blocked-overlay" />}
      
      {item && icon && (
        <>
          <div className="slot-icon-wrapper">
            <span className="slot-icon-text">{icon.abbreviation}</span>
          </div>
          {glow && <div className="slot-glow-effect" />}
        </>
      )}
      
      {showTooltip && item && icon && (
        <div
          className="tooltip-anchor"
          style={{ position: "fixed", left: tooltipPos.x, top: tooltipPos.y, zIndex: 1000 }}
        >
          <ItemTooltip item={item} icon={icon} />
        </div>
      )}
    </div>
  );
}

// ─── Equip Slot Component ────────────────────────────────────────────────────

interface EquipSlotDisplayProps {
  slot: EquipSlot;
  item: ModularItem | null;
  isBlocked: boolean;
  onUnequip?: (slot: EquipSlot) => void;
}

function EquipSlotDisplay({ slot, item, isBlocked, onUnequip }: EquipSlotDisplayProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const icon = useMemo(() => item ? resolveItemIcon(item) : null, [item]);
  const glow = item && hasGlowEffect(item.rarity);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (!item) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipPos({ x: rect.right + 8, y: rect.top });
    setShowTooltip(true);
  }, [item]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const handleClick = useCallback(() => {
    if (isBlocked || !item) return;
    onUnequip?.(slot);
  }, [isBlocked, item, slot, onUnequip]);

  const classNames = [
    "wow-equip-slot",
    item ? "has-item" : "empty",
    isBlocked ? "blocked" : "",
    glow ? "has-glow" : "",
    icon ? icon.rarityClass : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={classNames}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="button"
      aria-label={item ? `${EQUIP_SLOT_LABELS[slot]}: ${item.name}` : `${EQUIP_SLOT_LABELS[slot]}: Empty`}
      tabIndex={0}
    >
      <div className="equip-slot-label">{EQUIP_SLOT_LABELS[slot]}</div>
      
      {isBlocked && <div className="slot-blocked-overlay" />}
      
      {item && icon && (
        <div className="equip-slot-content">
          <span className="slot-icon-text">{icon.abbreviation}</span>
          {glow && <div className="slot-glow-effect" />}
        </div>
      )}
      
      {showTooltip && item && icon && (
        <div
          className="tooltip-anchor"
          style={{ position: "fixed", left: tooltipPos.x, top: tooltipPos.y, zIndex: 1000 }}
        >
          <ItemTooltip item={item} icon={icon} />
        </div>
      )}
    </div>
  );
}

// ─── Main Inventory Grid Component ──────────────────────────────────────────

interface InventoryGridProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function InventoryGrid({ isOpen = true, onClose }: InventoryGridProps) {
  const snapshot = useInventoryGrid();
  const [tooltip, setTooltip] = useState<{ item: ModularItem; x: number; y: number } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

// Handle WebSocket messages - useEffect ensures cleanup on unmount
  useEffect(() => {
    const handleNetworkPacket = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.event === "inventory_snapshot") {
        inventoryGridStore.receiveSnapshot(detail.payload);
      }
      if (detail?.event === "inventory_event") {
        inventoryGridStore.receiveEvent(detail.payload);
      }
      if (detail?.event === "inventory_error") {
        inventoryGridStore.clearPending();
      }
    };

    window.addEventListener("wasd:network-packet", handleNetworkPacket);
    return () => window.removeEventListener("wasd:network-packet", handleNetworkPacket);
  }, []);

  const handleEquip = useCallback((inventorySlotIndex: number) => {
    if (!snapshot?.inventory) return;
    const item = snapshot.inventory.slots[inventorySlotIndex];
    if (!item?.slot) return;

    const intent: InventoryIntent = {
      intent: "equip",
      inventorySlotIndex,
      targetEquipSlot: item.slot,
    };

    inventoryGridStore.dispatchIntent(intent);
    window.dispatchEvent(new CustomEvent("wasd:client-action", {
      detail: { action: "inventory_intent", payload: intent },
    }));
  }, [snapshot]);

  const handleUnequip = useCallback((equipSlot: EquipSlot) => {
    if (!snapshot?.inventory) return;
    const emptyIndex = snapshot.inventory.slots.findIndex(s => s === null);
    const targetSlot = emptyIndex >= 0 ? emptyIndex : 0;

    const intent: InventoryIntent = {
      intent: "unequip",
      equipSlot,
      targetInventorySlotIndex: targetSlot,
    };

    inventoryGridStore.dispatchIntent(intent);
    window.dispatchEvent(new CustomEvent("wasd:client-action", {
      detail: { action: "inventory_intent", payload: intent },
    }));
  }, [snapshot]);

  const handleMove = useCallback((fromSlot: number, toSlot: number) => {
    const intent: InventoryIntent = { intent: "move", fromSlot, toSlot };
    inventoryGridStore.dispatchIntent(intent);
    window.dispatchEvent(new CustomEvent("wasd:client-action", {
      detail: { action: "inventory_intent", payload: intent },
    }));
  }, []);

  const handleDrop = useCallback((inventorySlotIndex: number) => {
    const intent: InventoryIntent = { intent: "drop", inventorySlotIndex };
    inventoryGridStore.dispatchIntent(intent);
    window.dispatchEvent(new CustomEvent("wasd:client-action", {
      detail: { action: "inventory_intent", payload: intent },
    }));
  }, []);

  if (!isOpen) return null;

  const inventory = snapshot?.inventory;
  const equipment = snapshot?.equipment;
  const totalSlots = inventory?.slots?.length ?? DEFAULT_SLOT_COUNT;
  const gridRows = Math.ceil(totalSlots / GRID_COLUMNS);

  return (
    <div className="wow-inventory-overlay" role="dialog" aria-label="Inventory">
      {/* Header */}
      <div className="wow-inventory-header">
        <h2>INVENTORY</h2>
        {onClose && (
          <button
            className="wow-close-btn"
            onClick={onClose}
            aria-label="Close [ESC]"
            aria-keyshortcuts="Escape"
          >
            <kbd className="cz-kbd" aria-hidden="true">
              ESC
            </kbd>
            ✕
          </button>
        )}
        {inventory && (
          <div className="wow-weight">
            Weight: {inventory.weight.toFixed(1)} / {inventory.maxWeight}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="wow-inventory-content">
        {/* Equipment Panel */}
        <section className="wow-equipment-panel">
          <h3>Equipment</h3>
          <div className="wow-equip-grid">
            {EQUIP_SLOTS.map(slot => (
              <EquipSlotDisplay
                key={slot}
                slot={slot}
                item={equipment?.[slot] ?? null}
                isBlocked={inventoryGridStore.isBlocked(slot)}
                onUnequip={handleUnequip}
              />
            ))}
          </div>
        </section>

        {/* Backpack Grid */}
        <section className="wow-backpack-panel">
          <h3>Backpack</h3>
          <div
            className="wow-grid"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${GRID_COLUMNS}, 48px)`,
              gridTemplateRows: `repeat(${gridRows}, 48px)`,
              gap: "4px",
            }}
            role="grid"
          >
            {(inventory?.slots ?? Array(DEFAULT_SLOT_COUNT).fill(null)).map((item, index) => (
              <InventorySlot
                key={index}
                index={index}
                item={item}
                isBlocked={inventoryGridStore.isBlocked(index)}
                onEquip={handleEquip}
                onMove={handleMove}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Pending Intent Indicator */}
      {inventoryGridStore.hasPending() && (
        <div className="wow-pending-indicator">
          <span>⟳</span> Waiting for server...
        </div>
      )}
    </div>
  );
}

// ─── Mount Function ──────────────────────────────────────────────────────────

export function mountInventoryGrid(containerId = "inventory-mount"): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Inventory mount point #${containerId} not found`);
    return;
  }

  import("react").then(({ createRoot }) => {
    const root = createRoot(container);
    root.render(<InventoryGrid />);
  });
}