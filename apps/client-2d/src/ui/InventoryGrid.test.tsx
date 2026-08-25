/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { InventoryGrid } from "./InventoryGrid";

describe("InventoryGrid UX & Accessibility", () => {
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

  it("renders inventory overlay and title tooltips on slots", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<InventoryGrid isOpen={true} />);
    });

    expect(container!.textContent).toContain("INVENTORY");
    expect(container!.textContent).toContain("Backpack");
    expect(container!.textContent).toContain("Equipment");

    // Check that inventory slot has title tooltip
    const slotBtn = container!.querySelector("[aria-label='Slot 1: Empty']");
    expect(slotBtn).toBeTruthy();
    expect(slotBtn?.getAttribute("title")).toBe("Slot 1: Empty");

    // Check that equip slot has title tooltip
    const equipBtn = container!.querySelector("[aria-label='Head: Empty']");
    expect(equipBtn).toBeTruthy();
    expect(equipBtn?.getAttribute("title")).toBe("Head: Empty");
  });

  it("triggers onClose callback when Escape key is pressed", async () => {
    const handleClose = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<InventoryGrid isOpen={true} onClose={handleClose} />);
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
