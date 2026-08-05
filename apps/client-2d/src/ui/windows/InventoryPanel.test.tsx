/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { InventoryPanel } from "./InventoryPanel";
import type { PlayerInventorySnapshot } from "../../game/liveGameplaySnapshot";
import { dispatchSellResource, dispatchSellAllResources } from "../../game/gameplayActions";

vi.mock("../../game/gameplayActions", () => {
  return {
    dispatchSellResource: vi.fn(),
    dispatchSellAllResources: vi.fn(),
  };
});

describe("InventoryPanel UX & Accessibility", () => {
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

  const mockInventory: PlayerInventorySnapshot = {
    playerId: "player-1",
    capacity: 20,
    slots: [
      {
        slotId: "slot-0",
        itemId: "wood_log",
        name: "Wood Log",
        quantity: 5,
        category: "resource",
      },
    ],
  };

  it("renders inventory items and action buttons successfully", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<InventoryPanel inventory={mockInventory} />);
    });

    expect(container!.textContent).toContain("Wood Log");
    expect(container!.textContent).toContain("x5");

    const sellBtn = container!.querySelector("[data-testid='vendor-sell-wood_log']") as HTMLButtonElement;
    expect(sellBtn).toBeTruthy();
    expect(sellBtn.textContent).toContain("SELL");

    const sellAllBtn = container!.querySelector("[data-testid='sell-all-resources-button']") as HTMLButtonElement;
    expect(sellAllBtn).toBeTruthy();
    expect(sellAllBtn.textContent).toBe("Sell All Resources");
  });

  it("updates individual Sell button to loading state and disables actions on click", async () => {
    let resolveSellPromise: (val: any) => void = () => {};
    const sellPromise = new Promise((resolve) => {
      resolveSellPromise = resolve;
    });

    vi.mocked(dispatchSellResource).mockImplementation(() => sellPromise as any);

    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<InventoryPanel inventory={mockInventory} />);
    });

    const sellBtn = container!.querySelector("[data-testid='vendor-sell-wood_log']") as HTMLButtonElement;
    const sellAllBtn = container!.querySelector("[data-testid='sell-all-resources-button']") as HTMLButtonElement;

    expect(sellBtn.disabled).toBe(false);
    expect(sellBtn.getAttribute("aria-busy")).toBe("false");

    await act(async () => {
      sellBtn.click();
    });

    // Button should now be disabled, showing SELLING... and aria-busy=true
    expect(sellBtn.disabled).toBe(true);
    expect(sellBtn.getAttribute("aria-busy")).toBe("true");
    expect(sellBtn.textContent).toBe("SELLING...");
    expect(sellBtn.getAttribute("title")).toBe("Selling Wood Log...");

    // Sell All button should also be disabled during this operation
    expect(sellAllBtn.disabled).toBe(true);

    // Resolve the promise to end loading state
    await act(async () => {
      resolveSellPromise({ ok: true, result: { totalCoins: 5 } });
    });

    // Check that states returned to idle
    expect(sellBtn.disabled).toBe(false);
    expect(sellBtn.getAttribute("aria-busy")).toBe("false");
    expect(sellBtn.textContent).toContain("SELL");
    expect(sellAllBtn.disabled).toBe(false);
  });

  it("updates Sell All button to loading state and disables actions on click", async () => {
    let resolveSellAllPromise: (val: any) => void = () => {};
    const sellAllPromise = new Promise((resolve) => {
      resolveSellAllPromise = resolve;
    });

    vi.mocked(dispatchSellAllResources).mockImplementation(() => sellAllPromise as any);

    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<InventoryPanel inventory={mockInventory} />);
    });

    const sellBtn = container!.querySelector("[data-testid='vendor-sell-wood_log']") as HTMLButtonElement;
    const sellAllBtn = container!.querySelector("[data-testid='sell-all-resources-button']") as HTMLButtonElement;

    expect(sellAllBtn.disabled).toBe(false);
    expect(sellAllBtn.getAttribute("aria-busy")).toBe("false");

    await act(async () => {
      sellAllBtn.click();
    });

    // Sell All button should now be disabled, showing Selling... and aria-busy=true
    expect(sellAllBtn.disabled).toBe(true);
    expect(sellAllBtn.getAttribute("aria-busy")).toBe("true");
    expect(sellAllBtn.textContent).toBe("Selling...");
    expect(sellAllBtn.getAttribute("title")).toBe("Selling resources...");

    // Individual Sell button should also be disabled during this operation
    expect(sellBtn.disabled).toBe(true);

    // Resolve the promise to end loading state
    await act(async () => {
      resolveSellAllPromise({ ok: true, result: { totalCoins: 25 } });
    });

    // Check that states returned to idle
    expect(sellAllBtn.disabled).toBe(false);
    expect(sellAllBtn.getAttribute("aria-busy")).toBe("false");
    expect(sellAllBtn.textContent).toBe("Sell All Resources");
    expect(sellBtn.disabled).toBe(false);
  });
});
