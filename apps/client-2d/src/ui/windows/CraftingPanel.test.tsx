/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { CraftingPanel } from "./CraftingPanel";
import type { CraftingSnapshot } from "../../game/liveGameplaySnapshot";

describe("CraftingPanel UX & Accessibility", () => {
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

  const mockCraftingData: CraftingSnapshot = {
    recipes: [
      {
        id: "wooden_sword",
        title: "Wooden Sword",
        requiredLevel: 1,
        craftingXpReward: 15,
        ingredients: [{ itemId: "wood", quantity: 3 }],
        outputs: [{ itemId: "wooden_sword", quantity: 1 }],
        craftable: true,
      },
      {
        id: "iron_shield",
        title: "Iron Shield",
        requiredLevel: 3,
        craftingXpReward: 50,
        ingredients: [{ itemId: "iron_bar", quantity: 5 }],
        outputs: [{ itemId: "iron_shield", quantity: 1 }],
        craftable: false,
        blockedReason: "missing_ingredients",
      },
      {
        id: "steel_axe",
        title: "Steel Axe",
        requiredLevel: 10,
        craftingXpReward: 100,
        ingredients: [{ itemId: "steel_bar", quantity: 3 }],
        outputs: [{ itemId: "steel_axe", quantity: 1 }],
        craftable: false,
        blockedReason: "level_too_low",
      },
    ],
  };

  it("renders empty state correctly", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<CraftingPanel crafting={{ recipes: [] }} />);
    });

    expect(container!.querySelector("[data-testid='crafting-panel-empty']")).toBeTruthy();
    expect(container!.textContent).toContain("No crafting recipes yet.");
  });

  it("renders recipes with correct accessibility attributes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<CraftingPanel crafting={mockCraftingData} />);
    });

    expect(container!.querySelector("[data-testid='crafting-panel-live']")).toBeTruthy();

    // Wooden Sword - Craftable
    const swordBtn = container!.querySelector("button[title='Craft Wooden Sword']") as HTMLButtonElement;
    expect(swordBtn).toBeTruthy();
    expect(swordBtn.disabled).toBe(false);
    expect(swordBtn.getAttribute("aria-label")).toBe("Craft Wooden Sword");

    // Iron Shield - Missing Ingredients
    const shieldBtn = container!.querySelector("button[title='Missing required items to craft Iron Shield']") as HTMLButtonElement;
    expect(shieldBtn).toBeTruthy();
    expect(shieldBtn.disabled).toBe(true);
    expect(shieldBtn.getAttribute("aria-label")).toBe("Cannot craft Iron Shield: Missing required items to craft Iron Shield");

    // Steel Axe - Level Too Low
    const axeBtn = container!.querySelector("button[title='Required Crafting Lv. 10 is too high']") as HTMLButtonElement;
    expect(axeBtn).toBeTruthy();
    expect(axeBtn.disabled).toBe(true);
    expect(axeBtn.getAttribute("aria-label")).toBe("Cannot craft Steel Axe: Required Crafting Lv. 10 is too high");
  });

  it("triggers onCraft callback when clicked and manages loading state", async () => {
    let resolveCraftPromise!: () => void;
    const craftPromise = new Promise<void>((resolve) => {
      resolveCraftPromise = resolve;
    });

    const onCraftSpy = vi.fn().mockImplementation(() => craftPromise);

    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<CraftingPanel crafting={mockCraftingData} onCraft={onCraftSpy} />);
    });

    const swordBtn = container!.querySelector("button[title='Craft Wooden Sword']") as HTMLButtonElement;
    expect(swordBtn).toBeTruthy();

    // Click to craft
    await act(async () => {
      swordBtn.click();
    });

    expect(onCraftSpy).toHaveBeenCalledWith("wooden_sword");

    // Check loading state button updates
    expect(swordBtn.disabled).toBe(true);
    expect(swordBtn.textContent).toBe("Crafting...");
    expect(swordBtn.getAttribute("aria-busy")).toBe("true");
    expect(swordBtn.getAttribute("aria-label")).toBe("Crafting Wooden Sword in progress");
    expect(swordBtn.getAttribute("title")).toBe("Crafting Wooden Sword in progress");

    // Other buttons should also be temporarily disabled during any active crafting process
    const shieldBtn = container!.querySelector("button[title='Missing required items to craft Iron Shield']") as HTMLButtonElement;
    expect(shieldBtn.disabled).toBe(true);

    // Resolve craft callback
    await act(async () => {
      resolveCraftPromise();
    });

    // Check return to original interactive state
    expect(swordBtn.disabled).toBe(false);
    expect(swordBtn.textContent).toBe("Craft");
    expect(swordBtn.getAttribute("aria-busy")).toBe("false");
    expect(swordBtn.getAttribute("aria-label")).toBe("Craft Wooden Sword");
  });
});