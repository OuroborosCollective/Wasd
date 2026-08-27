/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { EquipmentPanel } from "./EquipmentPanel";
import { useDnD, DnDProvider } from "../dnd/DnDContext";
import type { PlayerEquipmentSnapshot, PlayerInventorySnapshot, PaperdollSnapshot } from "../../game/liveGameplaySnapshot";

// Mock the gameplayActions dispatch functions
vi.mock("../../game/gameplayActions", () => ({
  dispatchEquip: vi.fn().mockResolvedValue({ ok: true }),
  dispatchUnequip: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("EquipmentPanel UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
    vi.clearAllMocks();
  });

  const mockEquipment: PlayerEquipmentSnapshot = {
    playerId: "test-player-1",
    schemaVersion: 1,
    slots: [
      {
        slotId: "weapon",
        itemId: "iron_sword",
        title: "Iron Sword",
        tier: 1,
      },
    ],
  };

  const mockInventory: PlayerInventorySnapshot = {
    playerId: "test-player-1",
    schemaVersion: 1,
    capacity: 32,
    slots: [
      {
        slotId: "slot_copper_axe",
        itemId: "copper_axe",
        name: "Copper Axe",
        quantity: 1,
        category: "equipment",
        stackable: false,
        maxStack: 1,
      },
    ],
  };

  const mockPaperdoll: PaperdollSnapshot = {
    character: {
      playerId: "test-player-1",
      characterId: "char-1",
      displayName: "Sir Testalot",
      archetype: "wanderer",
      selected: true,
    },
    slots: [
      {
        slotId: "weapon",
        itemId: "iron_sword",
        title: "Iron Sword",
      },
      {
        slotId: "helmet",
        itemId: null,
        title: "Empty",
      },
    ],
  };

  it("renders with correct dynamic ARIA labels and tabIndex on PaperdollSlotCard", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <DnDProvider>
          <EquipmentPanel
            playerId="test-player-1"
            equipment={mockEquipment}
            inventory={mockInventory}
            paperdoll={mockPaperdoll}
          />
        </DnDProvider>
      );
    });

    const weaponSlot = container!.querySelector('[data-testid="equipment-slot-weapon"]') as HTMLButtonElement;
    expect(weaponSlot).toBeTruthy();
    expect(weaponSlot.getAttribute("role")).toBe("button");
    expect(weaponSlot.getAttribute("tabIndex")).toBe("0");
    expect(weaponSlot.getAttribute("aria-label")).toBe("Unequip Iron Sword from Weapon");

    const helmetSlot = container!.querySelector('[data-testid="equipment-slot-helmet"]') as HTMLButtonElement;
    expect(helmetSlot).toBeTruthy();
    expect(helmetSlot.getAttribute("role")).toBe("button");
    expect(helmetSlot.getAttribute("tabIndex")).toBe("0");
    expect(helmetSlot.getAttribute("aria-label")).toBe("Empty Helmet slot");

    // Title tooltip matching aria-label
    expect(weaponSlot.getAttribute("title")).toBe("Unequip Iron Sword from Weapon");
    expect(helmetSlot.getAttribute("title")).toBe("Empty Helmet slot");

    // Container landmark accessibility attributes
    const panelSection = container!.querySelector('[data-testid="equipment-panel-live"]');
    expect(panelSection).toBeTruthy();
    expect(panelSection!.getAttribute("role")).toBe("region");
    expect(panelSection!.getAttribute("aria-label")).toBe("Player Equipment");
  });

  it("triggers onClose callback when Escape key is pressed", async () => {
    const handleClose = vi.fn();

    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <DnDProvider>
          <EquipmentPanel
            playerId="test-player-1"
            equipment={mockEquipment}
            inventory={mockInventory}
            paperdoll={mockPaperdoll}
            onClose={handleClose}
          />
        </DnDProvider>
      );
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("triggers unequip callback when the slot card itself is clicked", async () => {
    const { dispatchUnequip } = await import("../../game/gameplayActions");

    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <DnDProvider>
          <EquipmentPanel
            playerId="test-player-1"
            equipment={mockEquipment}
            inventory={mockInventory}
            paperdoll={mockPaperdoll}
          />
        </DnDProvider>
      );
    });

    const weaponSlot = container!.querySelector('[data-testid="equipment-slot-weapon"]') as HTMLButtonElement;
    await act(async () => {
      weaponSlot.click();
    });

    expect(dispatchUnequip).toHaveBeenCalledWith({
      playerId: "test-player-1",
      slotId: "weapon",
    });
  });

  it("supports keyboard triggers (Enter / Space) to unequip", async () => {
    const { dispatchUnequip } = await import("../../game/gameplayActions");

    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <DnDProvider>
          <EquipmentPanel
            playerId="test-player-1"
            equipment={mockEquipment}
            inventory={mockInventory}
            paperdoll={mockPaperdoll}
          />
        </DnDProvider>
      );
    });

    const weaponSlot = container!.querySelector('[data-testid="equipment-slot-weapon"]') as HTMLButtonElement;

    // Test Enter Key
    await act(async () => {
      weaponSlot.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
    });
    expect(dispatchUnequip).toHaveBeenCalledTimes(1);

    // Test Space Key
    await act(async () => {
      weaponSlot.dispatchEvent(
        new KeyboardEvent("keydown", { key: " ", bubbles: true })
      );
    });
    expect(dispatchUnequip).toHaveBeenCalledTimes(2);
  });
});
