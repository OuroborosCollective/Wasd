/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { CampTradePanel } from "./CampTradePanel";
import type { CampNpcSnapshot, CampStockSnapshot } from "../../game/liveGameplaySnapshot";

// Mock the external hook since it depends on global context we don't fully need for rendering tests
vi.mock("../../game/useLiveGameplaySnapshot", () => ({
  useLiveGameplaySnapshot: () => ({
    status: "live",
    wallet: { coin: 50 },
  }),
}));

describe("CampTradePanel UX & Accessibility", () => {
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

  const mockNpc: CampNpcSnapshot = {
    id: "npc-woodcutter-1",
    poiId: "poi-woodcutter-camp",
    name: "Arel Woodcutter",
    type: "camp_woodcutter",
    role: "Woodcutter",
    activity: "CHOPPING WOOD",
    position: { x: 15, y: 25 },
  };

  const mockStock: CampStockSnapshot = {
    poiId: "poi-woodcutter-camp",
    items: [
      {
        itemId: "wood_log",
        quantity: 10,
        buyPrice: 5,
        sellPrice: 2,
      },
    ],
  };

  it("renders worker details and stock item successfully", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <CampTradePanel npc={mockNpc} campStock={mockStock} onClose={() => {}} />
      );
    });

    expect(container!.textContent).toContain("CAMP EXCHANGE");
    expect(container!.textContent).toContain("Arel Woodcutter");
    expect(container!.textContent).toContain("CHOPPING WOOD");
    expect(container!.textContent).toContain("Wood Log");
    expect(container!.textContent).toContain("Stock: 10 Units");
  });

  it("includes the ESC close button hint and aria attributes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <CampTradePanel npc={mockNpc} campStock={mockStock} onClose={() => {}} />
      );
    });

    const closeBtn = container!.querySelector('[data-testid="camp-trade-close"]') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.getAttribute("aria-label")).toBe("Close [ESC]");
    expect(closeBtn.getAttribute("aria-keyshortcuts")).toBe("Escape");
    expect(closeBtn.querySelector(".cz-kbd")?.textContent).toBe("ESC");
  });

  it("sets up the hexagonal buy button with proper accessibility attributes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <CampTradePanel npc={mockNpc} campStock={mockStock} onClose={() => {}} />
      );
    });

    const buyBtn = container!.querySelector('[data-testid="camp-trade-buy-button"]') as HTMLButtonElement;
    expect(buyBtn).toBeTruthy();
    expect(buyBtn.disabled).toBe(false);
    expect(buyBtn.getAttribute("aria-busy")).toBe("false");
    expect(buyBtn.getAttribute("aria-label")).toBe("Buy 1 Wood Log for 5 coins");
  });
});
