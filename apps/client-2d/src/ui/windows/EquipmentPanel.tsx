/**
 * Ouroboros EquipmentPanel — Server-backed Paperdoll Equipment Display
 *
 * Displays authoritative paperdoll/equipment snapshot data and sends only equip/unequip intents.
 * No local equipment truth, no optimistic equip state, no fake slots.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDnD, type DragItem, type DragItemType } from "../dnd/DnDContext";
import type {
  PaperdollSnapshot,
  PaperdollSlotSnapshot,
  PlayerEquipmentSnapshot,
  PlayerInventorySnapshot,
  InventorySlotSnapshot,
} from "../../game/liveGameplaySnapshot";
import { dispatchEquip, dispatchUnequip } from "../../game/gameplayActions";
import { getDefaultGameplayPlayerId } from "../../game/liveGameplayStore";
import { getGatheringToolIcon } from "../utils/ItemIconMapper";
import "../inventoryGrid.css";
import "./equipmentPanel.css";

const SLOT_LABELS: Record<string, string> = {
  weapon: "Weapon",
  helmet: "Helmet",
  armor: "Armor",
  boots: "Boots",
  ring: "Ring",
  amulet: "Amulet",
  woodcutting_tool: "Woodcutting",
  mining_tool: "Mining",
  fishing_tool: "Fishing",
};

const SLOT_ICONS: Record<string, string> = {
  weapon: "⚔",
  helmet: "⛑",
  armor: "🛡",
  boots: "👢",
  ring: "💍",
  amulet: "◆",
  woodcutting_tool: "🪓",
  mining_tool: "⛏",
  fishing_tool: "🎣",
};

const EQUIPMENT_ACCEPTS: readonly DragItemType[] = ["INVENTORY_ITEM"];

type PendingAction =
  | { readonly kind: "equip"; readonly itemId: string }
  | { readonly kind: "unequip"; readonly slotId: string }
  | null;

interface EquipmentPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  playerId?: string;
  equipment?: PlayerEquipmentSnapshot | null;
  inventory?: PlayerInventorySnapshot | null;
  paperdoll?: PaperdollSnapshot | null;
}

function formatSlotLabel(slotId: string): string {
  return SLOT_LABELS[slotId] ?? slotId;
}

function slotIcon(slotId: string): string {
  return SLOT_ICONS[slotId] ?? "□";
}

function itemDisplayName(slot: InventorySlotSnapshot): string {
  return slot.name?.trim() || slot.itemId;
}

function createInventoryDragItem(slot: InventorySlotSnapshot): DragItem {
  return {
    type: "INVENTORY_ITEM",
    itemId: slot.itemId,
    slot: slot.slotId,
    rarity: slot.category,
    name: itemDisplayName(slot),
  };
}

function equipmentSlotFromPaperdoll(slot: PaperdollSlotSnapshot) {
  return {
    slotId: slot.slotId,
    itemId: slot.itemId,
    title: slot.title,
  };
}

function useEquipmentDropTarget(input: {
  slotId: string;
  disabled: boolean;
  onDropInventoryItem: (slotId: string, item: DragItem) => void;
}) {
  const { registerDropTarget, unregisterDropTarget } = useDnD();

  useEffect(() => {
    if (input.disabled) return;

    registerDropTarget({
      id: input.slotId,
      accepts: EQUIPMENT_ACCEPTS,
      onDrop: (item) => input.onDropInventoryItem(input.slotId, item),
    });

    return () => unregisterDropTarget(input.slotId);
  }, [input.disabled, input.slotId, input.onDropInventoryItem, registerDropTarget, unregisterDropTarget]);
}

function PaperdollSlotCard({
  slot,
  pending,
  onUnequip,
  onDropInventoryItem,
}: {
  slot: ReturnType<typeof equipmentSlotFromPaperdoll>;
  pending: PendingAction;
  onUnequip: (slotId: string) => void;
  onDropInventoryItem: (slotId: string, item: DragItem) => void;
}) {
  const { dragState, setHoveredTarget } = useDnD();
  const isPending = pending?.kind === "unequip" && pending.slotId === slot.slotId;
  const isDropTarget = dragState.isDragging && dragState.hoveredTarget === slot.slotId;
  const canReceiveInventoryDrop = dragState.isDragging && dragState.dragItem?.type === "INVENTORY_ITEM";
  const iconPath = slot.itemId ? getGatheringToolIcon(slot.itemId) : null;

  useEquipmentDropTarget({
    slotId: slot.slotId,
    disabled: isPending,
    onDropInventoryItem,
  });

  const className = [
    "equip-slot",
    slot.itemId ? "has-item" : "empty",
    isPending ? "blocked" : "",
    isDropTarget ? "drop-target" : "",
    canReceiveInventoryDrop ? "can-drop" : "",
  ].filter(Boolean).join(" ");

  const handleAction = useCallback(() => {
    if (slot.itemId && !isPending) {
      onUnequip(slot.slotId);
    }
  }, [slot.itemId, slot.slotId, isPending, onUnequip]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleAction();
      }
    },
    [handleAction]
  );

  const ariaLabel = slot.itemId
    ? `Unequip ${slot.title} from ${formatSlotLabel(slot.slotId)}`
    : `Empty ${formatSlotLabel(slot.slotId)} slot`;

  return (
    <article
      className={className}
      data-testid={`equipment-slot-${slot.slotId}`}
      data-slot-id={slot.slotId}
      data-item-id={slot.itemId ?? "empty"}
      onPointerEnter={() => {
        if (canReceiveInventoryDrop) setHoveredTarget(slot.slotId);
      }}
      onPointerLeave={() => {
        if (dragState.hoveredTarget === slot.slotId) setHoveredTarget(null);
      }}
      onClick={handleAction}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
    >
      <div className="equip-slot-silhouette">{slotIcon(slot.slotId)}</div>
      {iconPath ? (
        <div className="equip-slot-icon">
          <img src={iconPath} alt={slot.title} className="tool-svg-icon" />
        </div>
      ) : (
        <span className="slot-icon-text">{slotIcon(slot.slotId)}</span>
      )}
      <span className="equip-slot-label">{formatSlotLabel(slot.slotId)}</span>
      <strong className="equip-slot-title">{slot.title}</strong>
      {slot.itemId && (
        <button
          type="button"
          className="unequip-button"
          onClick={(e) => {
            e.stopPropagation();
            handleAction();
          }}
          disabled={isPending}
          data-testid={`unequip-slot-${slot.slotId}`}
        >
          {isPending ? "…" : "Unequip"}
        </button>
      )}
      {isDropTarget && <div className="drop-indicator" />}
    </article>
  );
}

function InventoryEquipmentButton({
  slot,
  disabled,
  onEquip,
}: {
  slot: InventorySlotSnapshot;
  disabled: boolean;
  onEquip: (itemId: string) => void;
}) {
  const { startDrag, updateGhostPosition, endDrag } = useDnD();
  const iconPath = getGatheringToolIcon(slot.itemId);
  const isDraggingRef = useRef(false);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!isDraggingRef.current) return;
      suppressClickRef.current = true;
      updateGhostPosition(event.clientX, event.clientY);
    };

    const handlePointerUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      endDrag(true);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [updateGhostPosition, endDrag]);

  return (
    <button
      type="button"
      className="tool-button rarity-equipment"
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        onEquip(slot.itemId);
      }}
      onPointerDown={(event) => {
        if (disabled) return;
        isDraggingRef.current = true;
        suppressClickRef.current = false;
        startDrag(createInventoryDragItem(slot), event);
      }}
      disabled={disabled}
      data-testid={`equip-item-${slot.itemId}`}
      title={`Equip ${itemDisplayName(slot)}`}
    >
      {iconPath && <img src={iconPath} alt={itemDisplayName(slot)} className="tool-svg-icon" />}
      <span className="tool-name">{itemDisplayName(slot)}</span>
      <small>x{slot.quantity}</small>
    </button>
  );
}

export function EquipmentPanel({
  isOpen = true,
  onClose,
  playerId,
  equipment,
  inventory,
  paperdoll,
}: EquipmentPanelProps) {
  const resolvedPlayerId = playerId ?? equipment?.playerId ?? inventory?.playerId ?? getDefaultGameplayPlayerId();
  const [pending, setPending] = useState<PendingAction>(null);
  const [rejection, setRejection] = useState<string | null>(null);

  const paperdollSlots = useMemo(() => {
    if (paperdoll?.slots?.length) {
      return paperdoll.slots.map(equipmentSlotFromPaperdoll);
    }

    return (equipment?.slots ?? []).map((slot) => ({
      slotId: slot.slotId,
      itemId: slot.itemId,
      title: slot.title,
    }));
  }, [paperdoll, equipment]);

  const equippedItemIds = useMemo(
    () => new Set(paperdollSlots.map((slot) => slot.itemId).filter((itemId): itemId is string => Boolean(itemId))),
    [paperdollSlots],
  );

  const inventoryEquipment = useMemo(
    () => (inventory?.slots ?? [])
      .filter((slot) => slot.category === "equipment" && slot.quantity > 0)
      .filter((slot) => !equippedItemIds.has(slot.itemId)),
    [inventory, equippedItemIds],
  );

  const postToast = useCallback((type: "success" | "error", message: string) => {
    window.dispatchEvent(new CustomEvent("wasd:toast", { detail: { type, message } }));
  }, []);

  const handleEquip = useCallback(async (itemId: string) => {
    setPending({ kind: "equip", itemId });
    setRejection(null);

    const result = await dispatchEquip({ playerId: resolvedPlayerId, itemId });

    if (result.ok) {
      postToast("success", "Equipment updated from server snapshot");
    } else {
      const message = result.error ?? "equip_failed";
      setRejection(message);
      postToast("error", `Equip rejected: ${message}`);
    }

    setPending(null);
  }, [postToast, resolvedPlayerId]);

  const handleUnequip = useCallback(async (slotId: string) => {
    setPending({ kind: "unequip", slotId });
    setRejection(null);

    const result = await dispatchUnequip({ playerId: resolvedPlayerId, slotId });

    if (result.ok) {
      postToast("success", "Equipment updated from server snapshot");
    } else {
      const message = result.error ?? "unequip_failed";
      setRejection(message);
      postToast("error", `Unequip rejected: ${message}`);
    }

    setPending(null);
  }, [postToast, resolvedPlayerId]);

  const handleDropInventoryItem = useCallback((_slotId: string, item: DragItem) => {
    if (item.type !== "INVENTORY_ITEM") return;
    void handleEquip(item.itemId);
  }, [handleEquip]);

  if (!isOpen) return null;

  return (
    <div className="equipment-panel wow-panel" data-player-id={resolvedPlayerId} data-testid="equipment-panel-live">
      <div className="equipment-header">
        <h2>Equipment</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="wow-close-btn"
            aria-label="Close [ESC]"
            aria-keyshortcuts="Escape"
          >
            <kbd className="cz-kbd" aria-hidden="true">ESC</kbd>
            ✕
          </button>
        )}
      </div>

      {rejection && (
        <p className="are-text-muted" data-testid="equipment-intent-rejected">
          Rejected: {rejection}
        </p>
      )}

      <div className="equipment-layout">
        <div className="paperdoll-container">
          <div className="paperdoll-title">Server Paperdoll</div>
          <div className="paperdoll-silhouette" aria-hidden="true">
            <div className="silhouette-head" />
            <div className="silhouette-torso" />
            <div className="silhouette-arms" />
            <div className="silhouette-legs" />
          </div>
        </div>

        <div className="equipment-slots">
          {paperdollSlots.length > 0 ? paperdollSlots.map((slot) => (
            <PaperdollSlotCard
              key={slot.slotId}
              slot={slot}
              pending={pending}
              onUnequip={handleUnequip}
              onDropInventoryItem={handleDropInventoryItem}
            />
          )) : (
            <p className="are-text-muted" data-testid="equipment-empty-snapshot">
              Waiting for authoritative equipment snapshot…
            </p>
          )}
        </div>
      </div>

      <div className="available-tools">
        <h3 className="subsection-title">Inventory Equipment</h3>
        {inventoryEquipment.length > 0 ? (
          <div className="tools-grid">
            {inventoryEquipment.map((slot) => (
              <InventoryEquipmentButton
                key={`${slot.slotId}:${slot.itemId}`}
                slot={slot}
                disabled={pending?.kind === "equip" && pending.itemId === slot.itemId}
                onEquip={handleEquip}
              />
            ))}
          </div>
        ) : (
          <p className="are-text-muted" data-testid="equipment-no-inventory-items">
            No unequipped equipment items in inventory.
          </p>
        )}
      </div>
    </div>
  );
}
