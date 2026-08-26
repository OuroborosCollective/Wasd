/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { CraftingWindow } from "./CraftingWindow";

let mockSnapshot = {
  status: "live",
  crafting: {
    recipes: [
      {
        id: "wooden_sword",
        title: "Wooden Sword",
        requiredLevel: 1,
        craftingXpReward: 15,
        craftTicks: 0,
        ingredients: [{ itemId: "wood", quantity: 3 }],
        outputs: [{ itemId: "wooden_sword", quantity: 1 }],
        craftable: true,
      },
      {
        id: "iron_shield",
        title: "Iron Shield",
        stationType: "furnace",
        requiredLevel: 3,
        craftingXpReward: 50,
        craftTicks: 2,
        ingredients: [{ itemId: "iron_bar", quantity: 5 }],
        outputs: [{ itemId: "iron_shield", quantity: 1 }],
        craftable: false,
        blockedReason: "missing_ingredients",
      },
      {
        id: "steel_axe",
        title: "Steel Axe",
        stationType: "workbench",
        requiredLevel: 10,
        craftingXpReward: 100,
        craftTicks: 5,
        ingredients: [{ itemId: "steel_bar", quantity: 3 }],
        outputs: [{ itemId: "steel_axe", quantity: 1 }],
        craftable: false,
        blockedReason: "level_too_low",
      },
    ],
  },
};

vi.mock("../../game/useLiveGameplaySnapshot", () => ({
  useLiveGameplaySnapshot: () => mockSnapshot,
}));

vi.mock("../../game/liveGameplayStore", () => ({
  getDefaultGameplayPlayerId: () => "player_123",
  fetchGameplaySnapshot: vi.fn(),
  liveGameplayStore: {
    getEvidence: () => ({ playerId: "player_123" }),
    markStale: vi.fn(),
    setSnapshot: vi.fn(),
  },
}));

vi.mock("../../game/crafting", () => ({
  craftRecipe: vi.fn(),
}));

describe("CraftingWindow UX & Accessibility", () => {
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

  it("calls onClose when Escape key is pressed", async () => {
    const onCloseSpy = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<CraftingWindow isOpen={true} onClose={onCloseSpy} />);
    });

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onCloseSpy).toHaveBeenCalledTimes(1);
  });

  it("renders station badges with aria-hidden on decorative emojis and hover title tooltips", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<CraftingWindow isOpen={true} />);
    });

    const furnaceBadge = container!.querySelector(".crafting-row__station[title='Furnace required']");
    expect(furnaceBadge).toBeTruthy();

    const emojiSpan = furnaceBadge!.querySelector("span[aria-hidden='true']");
    expect(emojiSpan).toBeTruthy();
    expect(emojiSpan!.textContent).toContain("🧱");
  });

  it("renders buttons with descriptive hover titles and aria-label attributes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<CraftingWindow isOpen={true} />);
    });

    // Outer overlay container dialog accessibility check
    const overlay = container!.querySelector(".wow-inventory-overlay");
    expect(overlay).toBeTruthy();
    expect(overlay!.getAttribute("role")).toBe("dialog");
    expect(overlay!.getAttribute("aria-label")).toBe("Crafting");

    // Sword - Craftable
    const swordBtn = container!.querySelector("[data-testid='process-wooden_sword']") as HTMLButtonElement;
    expect(swordBtn).toBeTruthy();
    expect(swordBtn.disabled).toBe(false);
    expect(swordBtn.getAttribute("aria-label")).toBe("Craft Wooden Sword");
    expect(swordBtn.getAttribute("title")).toBe("Craft Wooden Sword");

    // Shield - Missing Ingredients
    const shieldBtn = container!.querySelector("[data-testid='process-iron_shield']") as HTMLButtonElement;
    expect(shieldBtn).toBeTruthy();
    expect(shieldBtn.disabled).toBe(true);
    expect(shieldBtn.getAttribute("aria-label")).toBe("Missing required ingredients to craft Iron Shield");
    expect(shieldBtn.getAttribute("title")).toBe("Missing required ingredients to craft Iron Shield");

    // Steel Axe - Level Locked
    const axeBtn = container!.querySelector("[data-testid='process-steel_axe']") as HTMLButtonElement;
    expect(axeBtn).toBeTruthy();
    expect(axeBtn.disabled).toBe(true);
    expect(axeBtn.getAttribute("aria-label")).toBe("Requires Crafting Lv. 10");
    expect(axeBtn.getAttribute("title")).toBe("Requires Crafting Lv. 10");
  });
});
