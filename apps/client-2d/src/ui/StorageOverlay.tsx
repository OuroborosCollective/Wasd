/**
 * Ouroboros StorageOverlay — React UI with Server-Authoritative State
 * 
 * Axiom der Erhaltung: UI NEVER modifies state locally.
 * Every item transfer is a server intent. UI blocks until
 * server broadcasts the new snapshots.
 * 
 * Split-screen layout: Player Inventory (left) | Storage Container (right)
 * Click item to transfer to opposite storage.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSyncExternalStore } from "react";
import "./storageOverlay.css";
import {
  ModularItem,
  InventoryIntent,
  type ItemStats,
  type Rarity,
} from "@wasd/shared";

// ─── Constants ────────────────────────────────────────────────

const STORAGE_GRID_COLS = 6;

// ─── Types ────────────────────────────────────────────────────

export interface StorageSlot {
  itemId: string;
  quantity: number;
  signature?: string;
}

export interface StorageInventoryState {
  slots: ModularItem[];
  maxSlots: number;
  currentWeight: number;
  maxWeight: number;
}

export interface StorageSnapshot {
  storageId: string;
  storageType: 'basic' | 'advanced' | 'reinforced';
  inventory: StorageInventoryState;
  tick: number;
}

export interface TransferIntent {
  intent: 'transfer';
  fromStorageId: string;
  toStorageId: string;
  fromSlotIndex: number;
  toSlotIndex: number;
}

export type StorageEvent =
  | { event: 'storage_snapshot'; snapshot: StorageSnapshot }
  | { event: 'storage_error'; code: string; message: string }
  | { event: 'item_transferred'; fromStorageId: string; toStorageId: string; slotIndex: number };

const RARITY_COLORS: Record<Rarity, string> = {
  common: "#9d9d9d",
  uncommon: "#1eff00",
  rare: "#0070dd",
  epic: "#a335ee",
  legendary: "#ff8000",
  mystic: "#00ccff",
};

const STORAGE_TYPE_LABELS: Record<string, string> = {
  basic: "Wooden Chest",
  advanced: "Iron Chest", 
  reinforced: "Reinforced Vault",
};

// ─── State Store ────────────────────────────────────────────────

class StorageStateStore {
  private playerSnapshot: StorageInventoryState | null = null;
  private targetStorageSnapshot: StorageSnapshot | null = null;
  private pendingIntent: TransferIntent | null = null;
  private blockedFromSlot: number | null = null;
  private blockedToSlot: number | null = null;
  private readonly listeners = new Set<() => void>();

  public getPlayerSnapshot(): StorageInventoryState | null {
    return this.playerSnapshot;
  }

  public getStorageSnapshot(): StorageSnapshot | null {
    return this.targetStorageSnapshot;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  /** Set player inventory (synced from inventory_snapshot via parent) */
  public setPlayerSnapshot(snapshot: StorageInventoryState | null): void {
    this.playerSnapshot = snapshot;
    this.notify();
  }

  /** Called when server broadcasts storage_snapshot */
  public receiveStorageSnapshot(snapshot: StorageSnapshot): void {
    this.targetStorageSnapshot = snapshot;
    this.pendingIntent = null;
    this.blockedFromSlot = null;
    this.blockedToSlot = null;
    this.notify();
  }

  /** Fire a transfer intent — UI immediately enters blocked state */
  public dispatchTransfer(intent: TransferIntent): void {
    this.pendingIntent = intent;
    this.blockedFromSlot = intent.fromSlotIndex;
    this.blockedToSlot = intent.toSlotIndex;
    this.notify();
  }

  public isBlocked(slotIndex: number): boolean {
    return this.blockedFromSlot === slotIndex || this.blockedToSlot === slotIndex;
  }

  public hasPendingIntent(): boolean {
    return this.pendingIntent !== null;
  }

  /** Clear pending intent and blocked state */
  public clearPending(): void {
    this.pendingIntent = null;
    this.blockedFromSlot = null;
    this.blockedToSlot = null;
    this.notify();
  }

  public closeStorage(): void {
    this.targetStorageSnapshot = null;
    this.clearPending();
    this.notify();
  }

  public isOpen(): boolean {
    return this.targetStorageSnapshot !== null;
  }
}

export const storageStateStore = new StorageStateStore();

// ─── Hook ──────────────────────────────────────────────────────

export function useStoragePlayerSnapshot(): StorageInventoryState | null {
  return useSyncExternalStore(
    storageStateStore.subscribe,
    () => storageStateStore.getPlayerSnapshot(),
    () => null
  );
}

export function useStorageSnapshot(): StorageSnapshot | null {
  return useSyncExternalStore(
    storageStateStore.subscribe,
    () => storageStateStore.getStorageSnapshot(),
    () => null
  );
}

// ─── Helper Functions ──────────────────────────────────────────

function getItemIcon(item: ModularItem): string {
  const category = item.category ?? '';
  const baseName = item.name ?? '';
  
  if (category === "weapon") {
    if (baseName.includes("Dagger")) return "DG";
    if (baseName.includes("Sword") || baseName.includes("Longsword")) return "SW";
    if (baseName.includes("Greatsword") || baseName.includes("Claymore")) return "GS";
    if (baseName.includes("Axe")) return "AX";
    if (baseName.includes("Mace")) return "MC";
    return "WP";
  }
  if (category === "armor") {
    if (baseName.includes("Leather")) return "LT";
    if (baseName.includes("Chain")) return "CH";
    if (baseName.includes("Plate")) return "PL";
    return "AR";
  }
  if (category === "consumable") return "PO";
  if (category === "material") return "MT";
  
  return "IT";
}

// ─── Components ────────────────────────────────────────────────

interface StorageSlotProps {
  slotIndex: number;
  item: ModularItem | null;
  isBlocked: boolean;
  isStorageSide: boolean;
  onTransfer: (slotIndex: number) => void;
}

function StorageSlot({ slotIndex, item, isBlocked, isStorageSide, onTransfer }: StorageSlotProps) {
  const handleClick = useCallback(() => {
    if (!isBlocked) onTransfer(slotIndex);
  }, [isBlocked, slotIndex, onTransfer]);

  return (
    <div
      className={[
        "storage-slot",
        item ? "has-item" : "empty",
        isBlocked ? "blocked" : "",
        item ? `rarity-${item.rarity}` : "",
      ].filter(Boolean).join(" ")}
      onClick={handleClick}
      role="button"
      tabIndex={item && !isBlocked ? 0 : -1}
      aria-label={item ? `Item in slot ${slotIndex + 1}, ${item.name}` : `Empty slot ${slotIndex + 1}`}
    >
      {isBlocked && <span className="slot-spinner">⟳</span>}
      {item && (
        <>
          <span className="slot-icon">{getItemIcon(item)}</span>
          {item.rarity === "legendary" && <span className="slot-glow" />}
          <span className="slot-quantity">{slotIndex}</span>
        </>
      )}
    </div>
  );
}

// ─── Main Storage Overlay ───────────────────────────────────

interface StorageOverlayProps {
  /** Control visibility from parent */
  isOpen?: boolean;
  onClose?: () => void;
}

export function StorageOverlay({ isOpen = true, onClose }: StorageOverlayProps) {
  const playerSnapshot = useStoragePlayerSnapshot();
  const storageSnapshot = useStorageSnapshot();

  // Handle WebSocket messages
  useEffect(() => {
    const handleNetworkPacket = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      
      // Client-side: Player inventory snapshot (for left panel)
      if (detail?.event === "inventory_snapshot") {
        const invPayload = detail.payload;
        if (invPayload?.inventory) {
          storageStateStore.setPlayerSnapshot(invPayload.inventory);
        }
      }
      
      // Server response: Storage contents
      if (detail?.event === "storage_snapshot") {
        storageStateStore.receiveStorageSnapshot(detail.payload);
      }
      
      // Transfer success
      if (detail?.event === "item_transferred") {
        storageStateStore.clearPending();
      }
      
      // Transfer error
      if (detail?.event === "storage_error") {
        storageStateStore.clearPending();
      }
    };

    window.addEventListener("wasd:network-packet", handleNetworkPacket);

    return () => {
      window.removeEventListener("wasd:network-packet", handleNetworkPacket);
    };
  }, []);

  // ─── Transfer Handlers ──────────────────────────────────────────

  const transferToStorage = useCallback((fromPlayerSlotIndex: number) => {
    const playerInv = playerSnapshot;
    if (!playerInv?.slots?.[fromPlayerSlotIndex] || !storageSnapshot) return;

    const intent: TransferIntent = {
      intent: 'transfer',
      fromStorageId: 'player',
      toStorageId: storageSnapshot.storageId,
      fromSlotIndex: fromPlayerSlotIndex,
      toSlotIndex: -1, // Server finds first empty slot
    };

    storageStateStore.dispatchTransfer(intent);

    // Fire via event bus
    window.dispatchEvent(new CustomEvent("wasd:client-action", {
      detail: { action: "transfer_item", payload: intent },
    }));
  }, [playerSnapshot, storageSnapshot]);

  const transferToPlayer = useCallback((fromStorageSlotIndex: number) => {
    if (!storageSnapshot || !playerSnapshot) return;
    const storageItems = storageSnapshot.inventory.slots;
    if (!storageItems?.[fromStorageSlotIndex]) return;

    // Find first empty player slot
    const emptyPlayerSlot = playerSnapshot.slots.findIndex((s, i) => !s && i < playerSnapshot.maxSlots);
    if (emptyPlayerSlot < 0) return; // No empty slots

    const intent: TransferIntent = {
      intent: 'transfer',
      fromStorageId: storageSnapshot.storageId,
      toStorageId: 'player',
      fromSlotIndex: fromStorageSlotIndex,
      toSlotIndex: emptyPlayerSlot,
    };

    storageStateStore.dispatchTransfer(intent);

    window.dispatchEvent(new CustomEvent("wasd:client-action", {
      detail: { action: "transfer_item", payload: intent },
    }));
  }, [playerSnapshot, storageSnapshot]);

  const handleClose = useCallback(() => {
    // Notify server to release storage lock
    if (storageSnapshot) {
      window.dispatchEvent(new CustomEvent("wasd:client-action", {
        detail: { action: "close_storage", payload: { storageId: storageSnapshot.storageId } },
      }));
    }
    storageStateStore.closeStorage();
    onClose?.();
  }, [storageSnapshot, onClose]);

  // ─── Render ───────────────────────────────────────────────────

  if (!isOpen || !storageSnapshot) return null;

  const storageTypeLabel = STORAGE_TYPE_LABELS[storageSnapshot.storageType] ?? "Storage";
  const playerItems = playerSnapshot?.slots ?? [];
  const storageItems = storageSnapshot.inventory.slots;

  const playerGridRows = Math.ceil((playerSnapshot?.maxSlots ?? 12) / STORAGE_GRID_COLS);
  const storageGridRows = Math.ceil(storageSnapshot.inventory.maxSlots / STORAGE_GRID_COLS);

  return (
    <div className="storage-overlay" role="dialog" aria-label="Storage Transfer">
      {/* Header */}
      <div className="storage-header">
        <h2>Storage Transfer</h2>
        <button className="wow-close-btn" onClick={handleClose} aria-label="Close [ESC]" aria-keyshortcuts="Escape">
          <kbd className="cz-kbd" aria-hidden="true">ESC</kbd>
          ✕
        </button>
        <div className="storage-type">{storageTypeLabel}</div>
      </div>

      {/* Split Content */}
      <div className="storage-content">
        
        {/* Left: Player Inventory */}
        <section className="storage-panel player-panel" aria-label="Player Inventory">
          <h3>Player Inventory</h3>
          {playerSnapshot && (
            <div className="storage-weight">
              Weight: {playerSnapshot.currentWeight.toFixed(1)} / {playerSnapshot.maxWeight}
            </div>
          )}
          <div
            className="storage-grid"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${STORAGE_GRID_COLS}, 1fr)`,
              gridTemplateRows: `repeat(${playerGridRows}, 1fr)`,
            }}
            role="grid"
          >
            {(playerItems).map((item, index) => (
              <StorageSlot
                key={index}
                slotIndex={index}
                item={item}
                isBlocked={storageStateStore.isBlocked(index)}
                isStorageSide={false}
                onTransfer={transferToStorage}
              />
            ))}
          </div>
          <div className="panel-hint">← Click to move to storage</div>
        </section>

        {/* Divider */}
        <div className="storage-divider" aria-hidden="true">
          <div className="divider-line" />
          <div className="divider-icon">⟷</div>
          <div className="divider-line" />
        </div>

        {/* Right: Storage Container */}
        <section className="storage-panel container-panel" aria-label="Storage Container">
          <h3>{storageTypeLabel}</h3>
          <div className="storage-weight">
            Weight: {storageSnapshot.inventory.currentWeight.toFixed(1)} / {storageSnapshot.inventory.maxWeight}
          </div>
          <div
            className="storage-grid"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${STORAGE_GRID_COLS}, 1fr)`,
              gridTemplateRows: `repeat(${storageGridRows}, 1fr)`,
            }}
            role="grid"
          >
            {(storageItems).map((item, index) => (
              <StorageSlot
                key={index}
                slotIndex={index}
                item={item}
                isBlocked={storageStateStore.isBlocked(index)}
                isStorageSide={true}
                onTransfer={transferToPlayer}
              />
            ))}
          </div>
          <div className="panel-hint">Click to move to inventory →</div>
        </section>
      </div>

      {/* Pending Intent Indicator */}
      {storageStateStore.hasPendingIntent() && (
        <div className="pending-indicator">
          <span>⟳</span> Transferring...
        </div>
      )}
    </div>
  );
}

// ─── Export for UIManager integration ─────────────────────────

/**
 * Open the storage overlay with server data.
 * Called by UIManager when player receives open_storage action.
 */
export function openStorageOverlay(snapshot: StorageSnapshot): void {
  storageStateStore.receiveStorageSnapshot(snapshot);
}

/**
 * Close the storage overlay.
 * Called by UIManager or on server close command.
 */
export function closeStorageOverlay(): void {
  storageStateStore.closeStorage();
}
