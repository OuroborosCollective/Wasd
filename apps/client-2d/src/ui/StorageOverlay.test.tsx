/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import {
  StorageOverlay,
  storageStateStore,
  type StorageSnapshot,
  type StorageInventoryState,
} from "./StorageOverlay";

const mockPlayerInventory: StorageInventoryState = {
  slots: [
    {
      id: "i1",
      definitionId: "iron_sword",
      name: "Iron Sword",
      category: "weapon",
      rarity: "common",
      levelRequirement: 1,
      stats: {},
      affixes: [],
    },
    null as any,
  ],
  maxSlots: 12,
  currentWeight: 5.0,
  maxWeight: 100.0,
};

const mockStorageSnapshot: StorageSnapshot = {
  storageId: "chest_01",
  storageType: "basic",
  inventory: {
    slots: [
      {
        id: "i2",
        definitionId: "health_potion",
        name: "Health Potion",
        category: "consumable",
        rarity: "uncommon",
        levelRequirement: 1,
        stats: {},
        affixes: [],
      },
      null as any,
    ],
    maxSlots: 12,
    currentWeight: 2.0,
    maxWeight: 200.0,
  },
  tick: 100,
};

describe("StorageOverlay UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    act(() => {
      storageStateStore.setPlayerSnapshot(mockPlayerInventory);
      storageStateStore.receiveStorageSnapshot(mockStorageSnapshot);
    });
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
    act(() => {
      storageStateStore.closeStorage();
      storageStateStore.setPlayerSnapshot(null);
    });
    vi.restoreAllMocks();
  });

  it("renders storage header and items correctly", async () => {
    await act(async () => {
      const root = createRoot(container!);
      root.render(<StorageOverlay isOpen={true} />);
    });

    expect(container!.textContent).toContain("Storage Transfer");
    expect(container!.textContent).toContain("Wooden Chest");
    expect(container!.textContent).toContain("Player Inventory");
  });

  it("calls onClose and dispatches client action when Escape key is pressed", async () => {
    const handleClose = vi.fn();
    const actionSpy = vi.fn();
    window.addEventListener("wasd:client-action", actionSpy);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<StorageOverlay isOpen={true} onClose={handleClose} />);
    });

    await act(async () => {
      const event = new KeyboardEvent("keydown", { key: "Escape" });
      window.dispatchEvent(event);
    });

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(actionSpy).toHaveBeenCalled();
    const actionDetail = actionSpy.mock.calls[0][0].detail;
    expect(actionDetail.action).toBe("close_storage");
    expect(actionDetail.payload.storageId).toBe("chest_01");

    window.removeEventListener("wasd:client-action", actionSpy);
  });

  it("handles keyboard Enter and Space keys for item transfer on player slot", async () => {
    const actionSpy = vi.fn();
    window.addEventListener("wasd:client-action", actionSpy);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<StorageOverlay isOpen={true} />);
    });

    const playerSlots = container!.querySelectorAll('.player-panel .storage-slot');
    const slot1 = playerSlots[0] as HTMLDivElement;
    expect(slot1).toBeTruthy();
    expect(slot1.getAttribute("role")).toBe("button");
    expect(slot1.getAttribute("tabIndex")).toBe("0");

    // Trigger Enter key wrapped in act
    await act(async () => {
      const enterEvent = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
      slot1.dispatchEvent(enterEvent);
    });

    expect(actionSpy).toHaveBeenCalledTimes(1);
    expect(actionSpy.mock.calls[0][0].detail.action).toBe("transfer_item");
    expect(actionSpy.mock.calls[0][0].detail.payload.fromSlotIndex).toBe(0);

    window.removeEventListener("wasd:client-action", actionSpy);
  });

  it("handles keyboard Space key for item transfer on storage slot", async () => {
    const actionSpy = vi.fn();
    window.addEventListener("wasd:client-action", actionSpy);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<StorageOverlay isOpen={true} />);
    });

    const storageSlots = container!.querySelectorAll('.container-panel .storage-slot');
    const slot1 = storageSlots[0] as HTMLDivElement;
    expect(slot1).toBeTruthy();

    // Trigger Space key wrapped in act
    await act(async () => {
      const spaceEvent = new KeyboardEvent("keydown", { key: " ", bubbles: true });
      slot1.dispatchEvent(spaceEvent);
    });

    expect(actionSpy).toHaveBeenCalledTimes(1);
    expect(actionSpy.mock.calls[0][0].detail.action).toBe("transfer_item");
    expect(actionSpy.mock.calls[0][0].detail.payload.fromStorageId).toBe("chest_01");

    window.removeEventListener("wasd:client-action", actionSpy);
  });

  it("renders descriptive aria-label and title tooltips on inventory and storage slots", async () => {
    await act(async () => {
      const root = createRoot(container!);
      root.render(<StorageOverlay isOpen={true} />);
    });

    const playerSlots = container!.querySelectorAll('.player-panel .storage-slot');
    const playerSlot1 = playerSlots[0] as HTMLDivElement;
    expect(playerSlot1.getAttribute("aria-label")).toBe("Item in slot 1: Iron Sword (common) - Click to transfer to storage");
    expect(playerSlot1.getAttribute("title")).toBe("Iron Sword (common) - Click to transfer to storage");

    const storageSlots = container!.querySelectorAll('.container-panel .storage-slot');
    const storageSlot1 = storageSlots[0] as HTMLDivElement;
    expect(storageSlot1.getAttribute("aria-label")).toBe("Item in slot 1: Health Potion (uncommon) - Click to transfer to inventory");
    expect(storageSlot1.getAttribute("title")).toBe("Health Potion (uncommon) - Click to transfer to inventory");
  });
});
