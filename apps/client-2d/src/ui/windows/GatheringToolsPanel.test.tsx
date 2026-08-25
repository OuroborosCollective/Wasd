/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { GatheringToolsPanel } from "./GatheringToolsPanel";
import type { PlayerEquipmentSnapshot, PlayerInventorySnapshot } from "../../game/liveGameplaySnapshot";

// Mock the equipment equip API
vi.mock("../../game/equipment", () => ({
  equipGatheringTool: vi.fn().mockResolvedValue({ ok: true, result: { ok: true } }),
  unequipGatheringTool: vi.fn().mockResolvedValue({ ok: true }),
  fetchEquipmentState: vi.fn(),
}));

// Mock the gameplayActions claim starter tools function
vi.mock("../../game/gameplayActions", () => ({
  dispatchClaimStarterTools: vi.fn().mockResolvedValue({
    ok: true,
    result: { changed: true, equipped: ["wooden_axe", "copper_pickaxe", "simple_fishing_rod"] }
  }),
}));

describe("GatheringToolsPanel UX & Accessibility", () => {
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

  const mockEquipmentWithSome: PlayerEquipmentSnapshot = {
    playerId: "test-player",
    schemaVersion: 1,
    slots: [
      {
        slotId: "woodcutting_tool",
        itemId: "wooden_axe",
        title: "Wooden Axe",
        tier: 1,
      },
    ],
  };

  const mockEquipmentAll: PlayerEquipmentSnapshot = {
    playerId: "test-player",
    schemaVersion: 1,
    slots: [
      {
        slotId: "woodcutting_tool",
        itemId: "wooden_axe",
        title: "Wooden Axe",
        tier: 1,
      },
      {
        slotId: "mining_tool",
        itemId: "copper_pickaxe",
        title: "Copper Pickaxe",
        tier: 1,
      },
      {
        slotId: "fishing_tool",
        itemId: "simple_fishing_rod",
        title: "Simple Fishing Rod",
        tier: 1,
      },
    ],
  };

  const mockInventory: PlayerInventorySnapshot = {
    playerId: "test-player",
    schemaVersion: 1,
    capacity: 32,
    slots: [
      {
        slotId: "inv_copper_axe",
        itemId: "copper_axe",
        name: "Copper Axe",
        quantity: 1,
        category: "equipment",
        stackable: false,
        maxStack: 1,
      },
    ],
  };

  it("renders with correct heading and list of equipped tools", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <GatheringToolsPanel
          equipment={mockEquipmentWithSome}
          inventory={mockInventory}
        />
      );
    });

    const panel = container!.querySelector('[data-testid="gathering-tools-panel"]');
    expect(panel).toBeTruthy();
    expect(panel!.textContent).toContain("🪓 Woodcutting");
    expect(panel!.textContent).toContain("Wooden Axe");
  });

  it("renders with tool buttons having correct ARIA attributes and titles", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <GatheringToolsPanel
          equipment={mockEquipmentWithSome}
          inventory={mockInventory}
        />
      );
    });

    const toolBtn = container!.querySelector(".tool-button") as HTMLButtonElement;
    expect(toolBtn).toBeTruthy();
    expect(toolBtn.getAttribute("title")).toBe("Equip Copper Axe");
    expect(toolBtn.getAttribute("aria-label")).toBe("Equip Copper Axe to tool slot");
  });

  it("handles equip tool callback when tool button is clicked", async () => {
    const { equipGatheringTool } = await import("../../game/equipment");
    const onEquipMock = vi.fn();

    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <GatheringToolsPanel
          equipment={mockEquipmentWithSome}
          inventory={mockInventory}
          onEquip={onEquipMock}
        />
      );
    });

    const toolBtn = container!.querySelector(".tool-button") as HTMLButtonElement;
    await act(async () => {
      toolBtn.click();
    });

    expect(equipGatheringTool).toHaveBeenCalledWith("copper_axe");
    expect(onEquipMock).toHaveBeenCalledWith("copper_axe");
  });

  it("renders Claim Starter Tools button when missing tools and handles claim action", async () => {
    const { dispatchClaimStarterTools } = await import("../../game/gameplayActions");
    const onEquipMock = vi.fn();

    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <GatheringToolsPanel
          equipment={mockEquipmentWithSome}
          inventory={mockInventory}
          onEquip={onEquipMock}
        />
      );
    });

    const claimBtn = container!.querySelector('[data-testid="claim-starter-tools-button"]') as HTMLButtonElement;
    expect(claimBtn).toBeTruthy();
    expect(claimBtn.getAttribute("aria-label")).toBe("Claim free starter gathering tools");

    await act(async () => {
      claimBtn.click();
    });

    expect(dispatchClaimStarterTools).toHaveBeenCalled();
    expect(onEquipMock).toHaveBeenCalledWith("starter_tools_claimed");
  });

  it("does not render Claim Starter Tools button when all tools are equipped", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <GatheringToolsPanel
          equipment={mockEquipmentAll}
          inventory={mockInventory}
        />
      );
    });

    const claimBtn = container!.querySelector('[data-testid="claim-starter-tools-button"]');
    expect(claimBtn).toBeNull();
  });
});
