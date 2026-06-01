/**
 * Ouroboros EquipmentPanel — Paper-Doll Equipment Display
 * 
 * Anatomical equipment slots reflecting the human form.
 * Touch-safe drag & drop for equipping/unequipping items.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSyncExternalStore } from "react";
import { useDnD } from "../dnd/DnDContext";
import { type DragItem, type DragItemType } from "../dnd/DnDContext";
import { resolveItemIcon, hasGlowEffect } from "../utils/ItemIconMapper";
import type { ModularItem, EquipSlot } from "@wasd/shared";
import "../inventoryGrid.css";
import "./equipmentPanel.css";

// ─── Slot Configuration ───────────────────────────────────────────────────────

export type EquipSlotId = "HEAD" | "CHEST" | "MAIN_HAND" | "OFF_HAND" | "RING_1" | "RING_2" | "BOOTS" | "GLOVES";

interface SlotConfig {
  id: EquipSlotId;
  label: string;
  icon: string;
  accepts: DragItemType[];
}

const EQUIP_SLOTS_CONFIG: SlotConfig[] = [
  { id: "HEAD", label: "Head", icon: "⛑", accepts: ["INVENTORY_ITEM"] },
  { id: "CHEST", label: "Chest", icon: "🛡", accepts: ["INVENTORY_ITEM"] },
  { id: "GLOVES", label: "Gloves", icon: "🧤", accepts: ["INVENTORY_ITEM"] },
  { id: "MAIN_HAND", label: "Main Hand", icon: "⚔", accepts: ["INVENTORY_ITEM"] },
  { id: "OFF_HAND", label: "Off Hand", icon: "🛡", accepts: ["INVENTORY_ITEM"] },
  { id: "RING_1", label: "Ring", icon: "💍", accepts: ["INVENTORY_ITEM"] },
  { id: "RING_2", label: "Ring", icon: "💍", accepts: ["INVENTORY_ITEM"] },
  { id: "BOOTS", label: "Boots", icon: "👢", accepts: ["INVENTORY_ITEM"] },
];

// ─── Equipment Store ───────────────────────────────────────────────────────────

interface EquipmentState {
  equipment: Partial<Record<EquipSlot, ModularItem | null>>;
  playerId: string;
}

class EquipmentStore {
  private state: EquipmentState | null = null;
  private listeners = new Set<() => void>();
  getSnapshot() { return this.state; }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private notify(): void { this.listeners.forEach(l => l()); }
  setEquipment(eq: Partial<Record<EquipSlot, ModularItem | null>>, playerId: string): void {
    this.state = { equipment: eq, playerId };
    this.notify();
  }
  optimisticEquip(slot: EquipSlot, item: ModularItem | null): void {
    if (!this.state) return;
    this.state = { ...this.state, equipment: { ...this.state.equipment, [slot]: item } };
    this.notify();
  }
}

export const equipmentStore = new EquipmentStore();

export function useEquipment(): EquipmentState | null {
  return useSyncExternalStore((l) => equipmentStore.subscribe(l), () => equipmentStore.getSnapshot(), () => null);
}

// ─── Slot Component ──────────────────────────────────────────────────────────

interface EquipSlotComponentProps {
  config: SlotConfig;
  item: ModularItem | null;
  isBlocked: boolean;
  onEquip: (slot: EquipSlotId, item: DragItem) => void;
  onUnequip: (slot: EquipSlotId) => void;
}

function EquipSlotComponent({ config, item, isBlocked, onEquip, onUnequip }: EquipSlotComponentProps) {
  const { dragState, startDrag, updateGhostPosition, endDrag, setHoveredTarget } = useDnD();
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const isHoveredRef = useRef(false);
  const isDraggingRef = useRef(false);

  const icon = useMemo(() => item ? resolveItemIcon(item) : null, [item]);
  const glow = item && hasGlowEffect(item.rarity);
  const isDropTarget = dragState.isDragging && dragState.hoveredTarget === config.id;
  const canDrop = dragState.isDragging && dragState.dragItem;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isBlocked || !item) return;
    e.preventDefault();
    const dragItem: DragItem = { type: "EQUIPMENT_ITEM", itemId: item.id, slot: config.id, rarity: item.rarity, name: item.name };
    isDraggingRef.current = true;
    startDrag(dragItem, e);
  }, [item, config.id, isBlocked, startDrag]);

  useEffect(() => {
    if (!isDraggingRef.current && !isHoveredRef.current) return;
    const handlePointerMove = (e: PointerEvent) => {
      if (isDraggingRef.current) updateGhostPosition(e.clientX, e.clientY);
    };
    const handlePointerUp = () => {
      if (isDraggingRef.current) { isDraggingRef.current = false; endDrag(isHoveredRef.current); }
      isHoveredRef.current = false;
      setHoveredTarget(null);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [updateGhostPosition, endDrag, setHoveredTarget]);

  const handlePointerEnter = useCallback(() => {
    if (!dragState.isDragging || !dragState.dragItem) return;
    isHoveredRef.current = true;
    setHoveredTarget(config.id);
  }, [dragState.isDragging, dragState.dragItem, config.id, setHoveredTarget]);

  const handlePointerLeave = useCallback(() => {
    if (isHoveredRef.current) { isHoveredRef.current = false; setHoveredTarget(null); }
  }, [setHoveredTarget]);

  const handleClick = useCallback(() => {
    if (isBlocked || !item) return;
    onUnequip(config.id);
  }, [isBlocked, item, config.id, onUnequip]);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (!item) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipPos({ x: rect.right + 8, y: rect.top });
    setShowTooltip(true);
  }, [item]);

  const handleMouseLeave = useCallback(() => setShowTooltip(false), []);

  const classNames = [
    "equip-slot", item ? "has-item" : "empty", isBlocked ? "blocked" : "",
    glow ? "has-glow" : "", isDropTarget ? "drop-target" : "",
    canDrop ? "can-drop" : "", icon ? `rarity-${item?.rarity || "common"}` : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={classNames}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      aria-label={item ? `${config.label}: ${item.name}` : `${config.label}: Empty`}
      tabIndex={0}
    >
      <div className="equip-slot-silhouette">{config.icon}</div>
      {isBlocked && <div className="slot-blocked-overlay" />}
      {item && icon && (
        <>
          <div className="equip-slot-icon"><span className="slot-icon-text">{icon.abbreviation}</span></div>
          {glow && <div className="slot-glow-effect" />}
        </>
      )}
      {isDropTarget && <div className="drop-indicator" />}
      {showTooltip && item && icon && (
        <div className="tooltip-anchor" style={{ position: "fixed", left: tooltipPos.x, top: tooltipPos.y, zIndex: 1000 }}>
          <div className="wow-tooltip" style={{ borderColor: icon.borderColor }}>
            <div className="tooltip-name" style={{ color: icon.borderColor }}>{item.name}</div>
            <div className="tooltip-ilvl">iLvl {item.ilvl}</div>
            <div className="tooltip-rarity">{item.rarity}</div>
            <div className="tooltip-slot">Slot: {config.label}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface EquipmentPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function EquipmentPanel({ isOpen = true, onClose }: EquipmentPanelProps) {
  const equipment = useEquipment();
  const { dragState, startDrag, updateGhostPosition, endDrag, setHoveredTarget } = useDnD();

  useEffect(() => {
    const handleNetworkPacket = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.event === "inventory_snapshot") {
        const payload = detail.payload;
        if (payload?.equipment) equipmentStore.setEquipment(payload.equipment, payload.playerId || "");
      }
    };
    window.addEventListener("wasd:network-packet", handleNetworkPacket);
    return () => window.removeEventListener("wasd:network-packet", handleNetworkPacket);
  }, []);

  const handleEquip = useCallback((targetSlot: EquipSlotId, item: DragItem) => {
    window.dispatchEvent(new CustomEvent("wasd:client-action", {
      detail: { action: "inventory_intent", payload: { intent: "equip", inventorySlotIndex: parseInt(item.slot, 10), targetEquipSlot: targetSlot } },
    }));
    equipmentStore.optimisticEquip(targetSlot as EquipSlot, { id: item.itemId, rarity: item.rarity, name: item.name } as ModularItem);
  }, []);

  const handleUnequip = useCallback((sourceSlot: EquipSlotId) => {
    window.dispatchEvent(new CustomEvent("wasd:client-action", {
      detail: { action: "inventory_intent", payload: { intent: "unequip", equipSlot: sourceSlot, targetInventorySlotIndex: 0 } },
    }));
    equipmentStore.optimisticEquip(sourceSlot as EquipSlot, null);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="equipment-panel" role="region" aria-label="Equipment">
      <h3 className="panel-title">Equipment</h3>
      <div className="paper-doll">
        <div className="slot-row head-row">
          <EquipSlotComponent config={EQUIP_SLOTS_CONFIG[0]} item={equipment?.equipment.HEAD ?? null} isBlocked={false} onEquip={handleEquip} onUnequip={handleUnequip} />
        </div>
        <div className="slot-row chest-row">
          <EquipSlotComponent config={EQUIP_SLOTS_CONFIG[2]} item={equipment?.equipment.GLOVES ?? null} isBlocked={false} onEquip={handleEquip} onUnequip={handleUnequip} />
          <EquipSlotComponent config={EQUIP_SLOTS_CONFIG[1]} item={equipment?.equipment.CHEST ?? null} isBlocked={false} onEquip={handleEquip} onUnequip={handleUnequip} />
          <div className="slot-spacer" />
        </div>
        <div className="slot-row weapons-row">
          <EquipSlotComponent config={EQUIP_SLOTS_CONFIG[3]} item={equipment?.equipment.MAIN_HAND ?? null} isBlocked={false} onEquip={handleEquip} onUnequip={handleUnequip} />
          <div className="slot-spacer" />
          <EquipSlotComponent config={EQUIP_SLOTS_CONFIG[4]} item={equipment?.equipment.OFF_HAND ?? null} isBlocked={false} onEquip={handleEquip} onUnequip={handleUnequip} />
        </div>
        <div className="slot-row rings-row">
          <EquipSlotComponent config={EQUIP_SLOTS_CONFIG[5]} item={equipment?.equipment.RING_1 ?? null} isBlocked={false} onEquip={handleEquip} onUnequip={handleUnequip} />
          <div className="slot-spacer" />
          <EquipSlotComponent config={EQUIP_SLOTS_CONFIG[6]} item={equipment?.equipment.RING_2 ?? null} isBlocked={false} onEquip={handleEquip} onUnequip={handleUnequip} />
        </div>
        <div className="slot-row boots-row">
          <EquipSlotComponent config={EQUIP_SLOTS_CONFIG[7]} item={equipment?.equipment.BOOTS ?? null} isBlocked={false} onEquip={handleEquip} onUnequip={handleUnequip} />
        </div>
      </div>
    </div>
  );
}

export default EquipmentPanel;