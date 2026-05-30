/**
 * Ouroboros InventoryOverlay — React UI with Pessimistic State
 * 
 * Axiom der Erhaltung: UI NEVER modifies state locally.
 * Every equip/unequip/move is a server intent. UI blocks until
 * server broadcasts the new state.
 * 
 * React for UI, Pixi for World: This overlay only handles DOM/React.
 * Pixi receives events when visual avatar changes.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSyncExternalStore } from "react";
import "./inventoryOverlay.css";
import {
  EquipSlot,
  EQUIP_SLOTS,
  ModularItem,
  PlayerInventorySnapshot,
  InventoryIntent,
  parseItemSignature,
  type ItemStats,
  type Rarity,
} from "@wasd/shared";

// ─── Constants ────────────────────────────────────────────────

const INVENTORY_GRID_COLS = 6;
const DEFAULT_INVENTORY_SLOTS = 24;

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

const RARITY_COLORS: Record<Rarity, string> = {
  common: "#9d9d9d",
  uncommon: "#1eff00",
  rare: "#0070dd",
  epic: "#a335ee",
  legendary: "#ff8000",
  mystic: "#00ccff",
};

// ─── State Store ────────────────────────────────────────────────

class InventoryStateStore {
  private state: PlayerInventorySnapshot | null = null;
  private pendingIntent: InventoryIntent | null = null;
  private blockedSlotIndices: Set<number> = new Set();
  private blockedEquipSlots: Set<EquipSlot> = new Set();
  private readonly listeners = new Set<() => void>();

  public getSnapshot(): PlayerInventorySnapshot | null {
    return this.state;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  /** Called by network handler when server broadcasts inventory_snapshot */
  public receiveSnapshot(snapshot: PlayerInventorySnapshot): void {
    this.state = snapshot;
    this.pendingIntent = null;
    this.blockedSlotIndices.clear();
    this.blockedEquipSlots.clear();
    this.notify();
  }

  /** Called when server broadcasts inventory_event (item_equipped, item_unequipped) */
  public receiveEvent(event: { event: string; slot?: EquipSlot; item?: ModularItem | null }): void {
    if (!this.state) return;
    
    if (event.event === "item_equipped" && event.slot) {
      this.state = {
        ...this.state,
        equipment: {
          ...this.state.equipment,
          [event.slot]: event.item ?? null,
        },
      };
    } else if (event.event === "item_unequipped" && event.slot) {
      this.state = {
        ...this.state,
        equipment: {
          ...this.state.equipment,
          [event.slot]: null,
        },
      };
    }
    
    this.notify();
  }

  /** Fire an intent — UI immediately enters blocked state */
  public dispatchIntent(intent: InventoryIntent): void {
    this.pendingIntent = intent;
    
    // Block relevant slots
    if (intent.intent === "equip") {
      this.blockedSlotIndices.add(intent.inventorySlotIndex);
      this.blockedEquipSlots.add(intent.targetEquipSlot);
    } else if (intent.intent === "unequip") {
      this.blockedEquipSlots.add(intent.equipSlot);
      this.blockedSlotIndices.add(intent.targetInventorySlotIndex);
    } else if (intent.intent === "move") {
      this.blockedSlotIndices.add(intent.fromSlot);
      this.blockedSlotIndices.add(intent.toSlot);
    } else if (intent.intent === "drop") {
      this.blockedSlotIndices.add(intent.inventorySlotIndex);
    }
    
    this.notify();
  }

  /** Check if a slot is currently blocked (pending server confirmation) */
  public isBlocked(indexOrSlot: number | EquipSlot): boolean {
    if (typeof indexOrSlot === "string") {
      return this.blockedEquipSlots.has(indexOrSlot);
    }
    return this.blockedSlotIndices.has(indexOrSlot);
  }

  public hasPendingIntent(): boolean {
    return this.pendingIntent !== null;
  }
}

export const inventoryStateStore = new InventoryStateStore();

// ─── Hook ──────────────────────────────────────────────────────

export function useInventory(): PlayerInventorySnapshot | null {
  return useSyncExternalStore(
    inventoryStateStore.subscribe,
    () => inventoryStateStore.getSnapshot(),
    () => null
  );
}

// ─── Helper Functions ──────────────────────────────────────────

function formatStats(stats: ItemStats): string[] {
  const lines: string[] = [];
  if (stats.damage !== undefined) lines.push(`Damage: ${stats.damage}`);
  if (stats.armor !== undefined) lines.push(`Armor: ${stats.armor}`);
  if (stats.attackSpeed !== undefined) lines.push(`Speed: ${stats.attackSpeed.toFixed(2)}`);
  if (stats.critChance !== undefined) lines.push(`Crit: ${stats.critChance}%`);
  if (stats.critMultiplier !== undefined) lines.push(`Crit Mult: ${stats.critMultiplier}x`);
  if (stats.health !== undefined) lines.push(`Health: +${stats.health}`);
  if (stats.mana !== undefined) lines.push(`Mana: +${stats.mana}`);
  if (stats.strength !== undefined) lines.push(`Str: +${stats.strength}`);
  if (stats.agility !== undefined) lines.push(`Agi: +${stats.agility}`);
  if (stats.intelligence !== undefined) lines.push(`Int: +${stats.intelligence}`);
  if (stats.fireRes !== undefined) lines.push(`Fire Res: +${stats.fireRes}%`);
  if (stats.iceRes !== undefined) lines.push(`Ice Res: +${stats.iceRes}%`);
  if (stats.lightningRes !== undefined) lines.push(`Lightning Res: +${stats.lightningRes}%`);
  return lines;
}

function getItemIcon(item: ModularItem): string {
  // Derive 2-char icon from item category and base component
  const parsed = parseItemSignature(item.signature);
  const baseName = parsed.base.name;
  
  // Map weapon types to visual categories
  if (item.category === "weapon") {
    if (baseName.includes("Dagger")) return "DG";
    if (baseName.includes("Sword") || baseName.includes("Longsword")) return "SW";
    if (baseName.includes("Greatsword") || baseName.includes("Claymore")) return "GS";
    if (baseName.includes("Axe")) return "AX";
    if (baseName.includes("Mace")) return "MC";
    return "WP";
  }
  
  // Armor types
  if (item.category === "armor") {
    if (baseName.includes("Leather")) return "LT";
    if (baseName.includes("Chain")) return "CH";
    if (baseName.includes("Plate")) return "PL";
    return "AR";
  }
  
  return "IT";
}

// ─── Components ────────────────────────────────────────────────

interface ItemTooltipProps {
  item: ModularItem;
}

function ItemTooltip({ item }: ItemTooltipProps) {
  const stats = useMemo(() => formatStats(item.stats), [item.stats]);
  const rarityColor = RARITY_COLORS[item.rarity] ?? RARITY_COLORS.common;
  
  return (
    <div className="item-tooltip" style={{ borderColor: rarityColor }}>
      <div className="tooltip-header" style={{ color: rarityColor }}>
        <strong>{item.name}</strong>
        <span className="tooltip-level">iLvl {item.ilvl}</span>
      </div>
      <div className="tooltip-rarity">{item.rarity}</div>
      {item.slot && <div className="tooltip-slot">Slot: {item.slot}</div>}
      {item.requiredLevel && item.requiredLevel > 1 && (
        <div className="tooltip-req">Required Level: {item.requiredLevel}</div>
      )}
      {item.requiredClass && (
        <div className="tooltip-class">Class: {item.requiredClass}</div>
      )}
      <hr />
      <div className="tooltip-stats">
        {stats.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}

interface InventorySlotProps {
  index: number;
  item: ModularItem | null;
  isBlocked: boolean;
  onEquip: (index: number) => void;
  onMove: (from: number, to: number) => void;
  onDrop: (index: number) => void;
  onShowTooltip: (item: ModularItem | null, event: React.MouseEvent) => void;
}

function InventorySlot({
  index,
  item,
  isBlocked,
  onEquip,
  onMove,
  onDrop,
  onShowTooltip,
}: InventorySlotProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  
  const handleClick = () => {
    if (isBlocked || !item) return;
    
    // If already selected, deselect
    if (isSelected) {
      setIsSelected(false);
      return;
    }
    
    setIsSelected(true);
  };
  
  const handleDoubleClick = () => {
    if (isBlocked || !item) return;
    // Double-click = quick equip (if equippable)
    if (item.slot) {
      onEquip(index);
    }
  };
  
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isBlocked || !item) return;
    onDrop(index);
  };
  
  const rarityColor = item ? RARITY_COLORS[item.rarity] ?? RARITY_COLORS.common : undefined;
  const icon = item ? getItemIcon(item) : "";
  
  return (
    <div
      className={`inventory-slot ${isBlocked ? "blocked" : ""} ${isSelected ? "selected" : ""} ${item ? "has-item" : "empty"}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={(e) => item && onShowTooltip(item, e)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        borderColor: rarityColor,
        opacity: isBlocked ? 0.5 : 1,
      }}
      role="gridcell"
      aria-label={item ? `${item.name} (slot ${index + 1})` : `Empty slot ${index + 1}`}
    >
      {isBlocked && <span className="slot-spinner">⟳</span>}
      {item && (
        <>
          <span className="slot-icon">{icon}</span>
          {item.rarity === "legendary" && <span className="slot-glow" />}
        </>
      )}
    </div>
  );
}

interface EquipSlotDisplayProps {
  slot: EquipSlot;
  item: ModularItem | null;
  isBlocked: boolean;
  onUnequip: (slot: EquipSlot) => void;
  onShowTooltip: (item: ModularItem | null, event: React.MouseEvent) => void;
}

function EquipSlotDisplay({
  slot,
  item,
  isBlocked,
  onUnequip,
  onShowTooltip,
}: EquipSlotDisplayProps) {
  const rarityColor = item ? RARITY_COLORS[item.rarity] ?? RARITY_COLORS.common : undefined;
  const icon = item ? getItemIcon(item) : "";
  
  return (
    <div
      className={`equip-slot ${isBlocked ? "blocked" : ""} ${item ? "has-item" : "empty"}`}
      onClick={() => !isBlocked && item && onUnequip(slot)}
      onDoubleClick={() => !isBlocked && item && onUnequip(slot)}
      onMouseEnter={(e) => item && onShowTooltip(item, e)}
      onMouseLeave={() => {}}
      style={{ borderColor: rarityColor }}
      role="button"
      aria-label={item ? `${EQUIP_SLOT_LABELS[slot]}: ${item.name}` : `${EQUIP_SLOT_LABELS[slot]}: Empty`}
    >
      <span className="equip-slot-label">{EQUIP_SLOT_LABELS[slot]}</span>
      {isBlocked && <span className="slot-spinner">⟳</span>}
      {item && (
        <>
          <span className="slot-icon">{icon}</span>
          {item.rarity === "legendary" && <span className="slot-glow" />}
        </>
      )}
    </div>
  );
}

// ─── Main Inventory Overlay ───────────────────────────────────

interface InventoryOverlayProps {
  /** Control visibility from parent */
  isOpen?: boolean;
  onClose?: () => void;
}

export function InventoryOverlay({ isOpen = true, onClose }: InventoryOverlayProps) {
  const snapshot = useInventory();
  
  // Tooltip state
  const [tooltip, setTooltip] = useState<{ item: ModularItem; x: number; y: number } | null>(null);
  
  // Movement state for tap-to-move
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  
  // Handle WebSocket messages
  useEffect(() => {
    const handleSnapshot = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.type === "inventory_snapshot") {
        inventoryStateStore.receiveSnapshot(detail.payload);
      }
    };
    
    const handleEvent = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.type === "inventory_event") {
        inventoryStateStore.receiveEvent(detail.payload);
      }
    };
    
    window.addEventListener("wasd:world-packet", handleSnapshot);
    window.addEventListener("wasd:world-packet", handleEvent);
    
    return () => {
      window.removeEventListener("wasd:world-packet", handleSnapshot);
      window.removeEventListener("wasd:world-packet", handleEvent);
    };
  }, []);

  // ─── Action Handlers ──────────────────────────────────────────

  const handleEquip = useCallback((inventorySlotIndex: number) => {
    if (!snapshot?.inventory) return;
    
    // Find the correct equip slot for this item
    const item = snapshot.inventory.slots[inventorySlotIndex];
    if (!item?.slot) return;
    
    const intent: InventoryIntent = {
      intent: "equip",
      inventorySlotIndex,
      targetEquipSlot: item.slot,
    };
    
    inventoryStateStore.dispatchIntent(intent);
    
    // Fire via event bus
    window.dispatchEvent(new CustomEvent("wasd:client-action", {
      detail: { action: "inventory_intent", payload: intent },
    }));
  }, [snapshot]);

  const handleUnequip = useCallback((equipSlot: EquipSlot) => {
    if (!snapshot?.inventory) return;
    
    // Find first empty inventory slot
    const emptyIndex = snapshot.inventory.slots.findIndex((s) => s === null);
    const targetSlot = emptyIndex >= 0 ? emptyIndex : 0;
    
    const intent: InventoryIntent = {
      intent: "unequip",
      equipSlot,
      targetInventorySlotIndex: targetSlot,
    };
    
    inventoryStateStore.dispatchIntent(intent);
    
    window.dispatchEvent(new CustomEvent("wasd:client-action", {
      detail: { action: "inventory_intent", payload: intent },
    }));
  }, [snapshot]);

  const handleMove = useCallback((fromSlot: number, toSlot: number) => {
    const intent: InventoryIntent = {
      intent: "move",
      fromSlot,
      toSlot,
    };
    
    inventoryStateStore.dispatchIntent(intent);
    
    window.dispatchEvent(new CustomEvent("wasd:client-action", {
      detail: { action: "inventory_intent", payload: intent },
    }));
  }, []);

  const handleDrop = useCallback((inventorySlotIndex: number) => {
    const intent: InventoryIntent = {
      intent: "drop",
      inventorySlotIndex,
    };
    
    inventoryStateStore.dispatchIntent(intent);
    
    window.dispatchEvent(new CustomEvent("wasd:client-action", {
      detail: { action: "inventory_intent", payload: intent },
    }));
  }, []);

  const handleShowTooltip = useCallback((item: ModularItem, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      item,
      x: rect.right + 10,
      y: rect.top,
    });
  }, []);

  const handleHideTooltip = useCallback(() => {
    setTooltip(null);
  }, []);

  // ─── Render ────────────────────────────────────────────────────

  if (!isOpen) return null;

  const inventory = snapshot?.inventory;
  const equipment = snapshot?.equipment;

  // Calculate grid rows
  const totalSlots = inventory?.slots?.length ?? DEFAULT_INVENTORY_SLOTS;
  const gridRows = Math.ceil(totalSlots / INVENTORY_GRID_COLS);

  return (
    <div className="inventory-overlay" role="dialog" aria-label="Inventory">
      {/* Header */}
      <div className="inventory-header">
        <h2>Inventory</h2>
        {onClose && (
          <button className="close-btn" onClick={onClose} aria-label="Close inventory">
            ✕
          </button>
        )}
        {inventory && (
          <div className="inventory-weight">
            Weight: {inventory.weight.toFixed(1)} / {inventory.maxWeight}
          </div>
        )}
      </div>

      {/* Equipment Section */}
      <section className="equipment-section" aria-label="Equipment">
        <h3>Equipment</h3>
        <div className="equipment-grid">
          {EQUIP_SLOTS.map((slot) => (
            <EquipSlotDisplay
              key={slot}
              slot={slot}
              item={equipment?.[slot] ?? null}
              isBlocked={inventoryStateStore.isBlocked(slot)}
              onUnequip={handleUnequip}
              onShowTooltip={handleShowTooltip}
            />
          ))}
        </div>
      </section>

      {/* Inventory Grid */}
      <section className="inventory-section" aria-label="Backpack">
        <h3>Backpack</h3>
        <div
          className="inventory-grid"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${INVENTORY_GRID_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${gridRows}, 1fr)`,
          }}
          role="grid"
        >
          {(inventory?.slots ?? Array(DEFAULT_INVENTORY_SLOTS).fill(null)).map((item, index) => (
            <InventorySlot
              key={index}
              index={index}
              item={item}
              isBlocked={inventoryStateStore.isBlocked(index)}
              onEquip={handleEquip}
              onMove={handleMove}
              onDrop={handleDrop}
              onShowTooltip={handleShowTooltip}
            />
          ))}
        </div>
      </section>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="tooltip-container"
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            zIndex: 1000,
          }}
          onMouseEnter={() => {}}
          onMouseLeave={handleHideTooltip}
        >
          <ItemTooltip item={tooltip.item} />
        </div>
      )}

      {/* Pending Intent Indicator */}
      {inventoryStateStore.hasPendingIntent() && (
        <div className="pending-indicator">
          <span>⟳</span> Waiting for server...
        </div>
      )}
    </div>
  );
}

// ─── Export for UIManager integration ─────────────────────────

/**
 * Mount the InventoryOverlay into the DOM.
 * Called by UIManager when player opens inventory (default key: 'I' or 'Tab').
 */
export function mountInventoryOverlay(containerId = "inventory-mount"): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Inventory mount point #${containerId} not found`);
    return;
  }
  
  // Use React directly since we're in a Vite/React environment
  import("react").then(({ createRoot }) => {
    const root = createRoot(container);
    root.render(<InventoryOverlay />);
  });
}